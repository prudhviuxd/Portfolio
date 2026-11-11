package app.raga.assistant

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Checks the request Raga sends to Claude and how it reads the answer, against a local mock server. */
class AiBrainTest {
    private val server = MockWebServer()

    @Before fun setUp() { server.start(); AiBrain.baseUrl = server.url("/").toString().trimEnd('/'); AiBrain.forget() }
    @After fun tearDown() { server.shutdown(); AiBrain.baseUrl = null }

    private fun reply(json: String) = MockResponse().setHeader("content-type", "application/json").setBody(
        JSONObject().put("id", "msg_1").put("type", "message").put("role", "assistant").put("model", "claude-opus-5-5")
            .put("content", org.json.JSONArray().put(JSONObject().put("type", "text").put("text", json)))
            .put("stop_reason", "end_turn").put("stop_sequence", JSONObject.NULL)
            .put("usage", JSONObject().put("input_tokens", 10).put("output_tokens", 5)).toString(),
    )

    @Test fun turnsRequestIntoCommandAndRemembersConversation() {
        server.enqueue(reply("""{"command":"play arijit singh","reply":""}"""))
        val a = AiBrain.interpret("test-key", "I want to hear something by Arijit")!!
        assertEquals("play arijit singh", a.command)
        assertEquals(null, a.reply)
        assertTrue(CommandParser.parse(a.command!!) is Command.PlaySong)

        val req = server.takeRequest()
        assertEquals("/v1/messages", req.path)
        // the SDK sends the key itself (as x-api-key or a bearer token, depending on version)
        assertTrue(req.getHeader("x-api-key") == "test-key" || req.getHeader("Authorization") == "Bearer test-key")
        assertTrue(req.getHeader("anthropic-beta")!!.contains("server-side-fallback-2026-07-01"))
        val body = JSONObject(req.body.readUtf8())
        assertEquals("claude-opus-5-5", body.getString("model"))
        assertEquals("default", body.getString("fallbacks"))
        assertEquals("low", body.getJSONObject("output_config").getString("effort"))
        assertEquals("json_schema", body.getJSONObject("output_config").getJSONObject("format").getString("type"))

        // a follow-up carries the earlier turn
        server.enqueue(reply("""{"command":"","reply":"Arijit Singh is an Indian playback singer."}"""))
        val b = AiBrain.interpret("test-key", "who is he?")!!
        assertEquals(null, b.command)
        assertEquals("Arijit Singh is an Indian playback singer.", b.reply)
        val msgs = JSONObject(server.takeRequest().body.readUtf8()).getJSONArray("messages")
        assertEquals(3, msgs.length())
    }

    @Test fun badKeyGivesAFriendlyAnswer() {
        server.enqueue(MockResponse().setResponseCode(401).setHeader("content-type", "application/json")
            .setBody("""{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}"""))
        val a = AiBrain.interpret("bad", "hello")!!
        assertTrue(a.reply!!.contains("key"))
    }
}
