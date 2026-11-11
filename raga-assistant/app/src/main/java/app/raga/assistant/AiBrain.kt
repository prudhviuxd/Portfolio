package app.raga.assistant

import android.content.Context
import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.errors.AnthropicServiceException
import com.anthropic.errors.UnauthorizedException
import com.anthropic.errors.RateLimitException
import com.anthropic.models.messages.JsonOutputFormat
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.OutputConfig
import com.anthropic.models.messages.StopReason
import org.json.JSONObject
import java.time.Duration

/**
 * Optional "smart understanding" using Claude. When Raga's built-in parser doesn't understand
 * a request — or the owner is chatting — Claude rewrites the request as one of Raga's own
 * command phrases (which the phone then carries out locally), or answers it directly.
 * Remembers the recent conversation so follow-ups like "and call him too" work.
 *
 * Only used when the owner has added their own Anthropic API key in Settings; the text of
 * the request (not audio) is then sent to Anthropic.
 */
object AiBrain {

    data class Answer(val command: String?, val reply: String?)

    private const val MODEL = "claude-opus-5-5"
    private const val MAX_TURNS = 12

    private val history = ArrayDeque<Pair<Boolean, String>>() // (isUser, text)
    @Volatile private var client: AnthropicClient? = null
    @Volatile private var clientKey: String? = null
    /** Tests point this at a local mock server. */
    @Volatile internal var baseUrl: String? = null

    fun enabled(ctx: Context) = Prefs(ctx).aiKey.isNotBlank()

    private fun client(key: String): AnthropicClient = synchronized(this) {
        if (client == null || clientKey != key) {
            client = AnthropicOkHttpClient.builder()
                .apiKey(key)
                .apply { baseUrl?.let { baseUrl(it) } }
                .timeout(Duration.ofSeconds(30))
                .maxRetries(1)
                .build()
            clientKey = key
        }
        client!!
    }

    private val SYSTEM = """
        You are Raga, a friendly hands-free voice assistant running on the owner's Android phone.
        Requests arrive as speech-to-text (so expect mis-heard words) or typed chat.

        The phone can only carry out actions phrased as one of these command patterns:
        - play <song, artist or album> | play <song> on spotify | play <video> on youtube | play some music
        - pause | resume | next song | previous song
        - call <contact name or digits>
        - send a message to <contact> saying <text>
        - send whatsapp to <contact> saying <text>
        - open <app name> | close <app name> | close this app | close all apps
        - open file <file name> | send file <file name> on <app>
        - click <button label> | type <text> | scroll down | scroll up | go back | go home
        - lock the phone | take a screenshot | take a photo
        - turn on the flashlight | turn off the flashlight
        - volume up | volume down | mute | unmute | set volume to <number> percent
        - set an alarm for <h:mm am/pm> | set a timer for <n> minutes
        - what time is it | what's the date | battery level
        - navigate to <place> | search for <query>
        - open wifi settings | open bluetooth settings | open settings
        - stop listening

        Reply with JSON only: {"command": string, "reply": string}.
        - If the request (or the conversation so far) asks the phone to do something, set "command" to the
          single best command phrase above, filled in with the right names, and "reply" to "".
        - If it is a question or chat you can answer yourself, set "command" to "" and put the answer in
          "reply": one to three short sentences that sound natural when read aloud, no lists or markdown.
        - If it needs something the phone can't do, say so briefly in "reply" and suggest the closest
          thing it can do.
        - Correct obvious speech-recognition mistakes (e.g. "call my mum" -> "call mom", "what's app" -> "whatsapp").
    """.trimIndent()

    private val schema: JsonOutputFormat.Schema = JsonOutputFormat.Schema.builder()
        .putAdditionalProperty("type", JsonValue.from("object"))
        .putAdditionalProperty(
            "properties",
            JsonValue.from(
                mapOf(
                    "command" to mapOf("type" to "string"),
                    "reply" to mapOf("type" to "string"),
                ),
            ),
        )
        .putAdditionalProperty("required", JsonValue.from(listOf("command", "reply")))
        .putAdditionalProperty("additionalProperties", JsonValue.from(false))
        .build()

    /** Blocking network call; run on a background thread. Returns null if AI is off. */
    fun interpret(ctx: Context, text: String): Answer? = interpret(Prefs(ctx).aiKey.trim(), text)

    internal fun interpret(key: String, text: String): Answer? {
        if (key.isEmpty()) return null
        val builder = MessageCreateParams.builder()
            .model(MODEL)
            .maxTokens(4000L)
            .system(SYSTEM)
            // fast, conversational: low effort keeps answers quick for a voice assistant
            .outputConfig(
                OutputConfig.builder()
                    .effort(OutputConfig.Effort.LOW)
                    .format(JsonOutputFormat.builder().schema(schema).build())
                    .build(),
            )
            // if a request is declined by a safety check, retry automatically on a fallback model
            .putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
            .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
        synchronized(history) {
            for ((isUser, t) in history) if (isUser) builder.addUserMessage(t) else builder.addAssistantMessage(t)
        }
        builder.addUserMessage(text)

        return try {
            val response = client(key).messages().create(builder.build())
            if (response.stopReason().orElse(null) == StopReason.REFUSAL) {
                return Answer(null, "Sorry, I can't help with that one.")
            }
            val raw = response.content().joinToString("") { b -> b.text().map { it.text() }.orElse("") }
            val o = JSONObject(raw)
            val answer = Answer(
                o.optString("command").trim().ifBlank { null },
                o.optString("reply").trim().ifBlank { null },
            )
            remember(text, raw)
            answer
        } catch (e: UnauthorizedException) {
            Answer(null, "Your AI key wasn't accepted. Check it in Raga's settings.")
        } catch (e: RateLimitException) {
            Answer(null, "The AI service is busy right now. Try again in a moment.")
        } catch (e: AnthropicServiceException) {
            Answer(null, "The AI service had a problem (${e.statusCode()}).")
        } catch (e: Exception) {
            Answer(null, "I couldn't reach the AI service. Check the internet connection.")
        }
    }

    /** Keep a short memory of the conversation (also for turns Raga handled itself). */
    fun remember(user: String, assistant: String) {
        synchronized(history) {
            history.addLast(true to user)
            history.addLast(false to assistant)
            while (history.size > MAX_TURNS * 2) { history.removeFirst(); history.removeFirst() }
        }
    }

    fun forget() = synchronized(history) { history.clear() }
}
