package app.raga.assistant

import android.app.KeyguardManager
import android.content.Context
import android.os.Handler
import android.os.HandlerThread
import org.vosk.Model
import org.vosk.SpeakerModel

/**
 * Process-wide pieces shared by the wake-word service and the assistant screen:
 * the offline models (loaded once), the command runner (so music keeps playing after the
 * assistant card closes) and the conversation state (a pending "Shall I send it?").
 */
object Shared {
    val workerThread = HandlerThread("raga-commands").apply { start() }
    val worker = Handler(workerThread.looper)

    @Volatile private var executorInstance: CommandExecutor? = null
    fun executor(ctx: Context): CommandExecutor = executorInstance ?: synchronized(this) {
        executorInstance ?: CommandExecutor(ctx.applicationContext) { RagaService.stop(ctx.applicationContext) }
            .also { executorInstance = it }
    }

    // ---- offline models
    @Volatile private var model: Model? = null
    @Volatile private var modelId: String? = null
    @Volatile private var speaker: SpeakerModel? = null

    /** Blocking; call off the main thread. */
    @Synchronized
    fun models(ctx: Context): Pair<Model, SpeakerModel>? {
        val prefs = Prefs(ctx)
        val id = prefs.modelName
        if (!ModelManager.isInstalled(ctx, id) || !ModelManager.isInstalled(ctx, ModelManager.SPEAKER_MODEL.id)) return null
        if (model == null || modelId != id) {
            model?.close()
            model = Model(ModelManager.dir(ctx, id).absolutePath)
            modelId = id
        }
        if (speaker == null) speaker = SpeakerModel(ModelManager.dir(ctx, ModelManager.SPEAKER_MODEL.id).absolutePath)
        return model!! to speaker!!
    }

    // ---- conversation
    /** A question Raga asked and is waiting to hear the answer to. */
    @Volatile var followUp: FollowUp? = null

    /**
     * The assistant screen is exported (so the phone can launch it as the assistant), which
     * means other apps can open it too. A pre-heard command is only accepted with this
     * secret, known only inside Raga's own process.
     */
    val token: String = java.util.UUID.randomUUID().toString()

    /** Runs on the worker thread: turns what was said into an action and a reply. */
    fun decide(ctx: Context, text: String): Outcome {
        val pending = followUp
        followUp = null
        val cmd = CommandParser.parse(text)
        when (pending) {
            is FollowUp.Confirm -> return when (cmd) {
                Command.Yes -> pending.onYes()
                Command.No, Command.Cancel -> Outcome("Okay, cancelled.")
                else -> Outcome("Please say yes or no.", pending)
            }
            is FollowUp.Ask -> return if (cmd == Command.Cancel) Outcome("Okay, cancelled.") else pending.onAnswer(text)
            null -> {}
        }
        RagaStatus.add("→ ${cmd.javaClass.simpleName}")
        blockedReason(ctx, cmd)?.let { return Outcome(it) }
        return executor(ctx).execute(cmd)
    }

    /**
     * Sending messages or files and tapping/typing on screen need a saved voice print
     * (unless voice checking was switched off) and an unlocked phone.
     */
    private fun blockedReason(ctx: Context, cmd: Command): String? {
        val sensitive = cmd is Command.SendSms || cmd is Command.SendWhatsApp || cmd is Command.ShareFile ||
            cmd is Command.OpenFile || cmd is Command.Click || cmd is Command.TypeText
        if (!sensitive) return null
        val prefs = Prefs(ctx)
        if (prefs.verifyVoice && prefs.voicePrint == null) {
            return "For your safety, teach Raga your voice in Settings before sending messages or files."
        }
        if (ctx.getSystemService(KeyguardManager::class.java).isKeyguardLocked) return "Please unlock your phone first."
        return null
    }
}
