package app.raga.assistant

import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Siri-style card shown over any app while Raga listens and answers.
 * It also matters functionally: Android 15 only lets an app open other apps from the
 * background while it has a visible overlay window.
 */
class Bubble(private val ctx: Context) {
    private val wm = ctx.getSystemService(WindowManager::class.java)
    private val main = Handler(Looper.getMainLooper())
    private var root: LinearLayout? = null
    private lateinit var title: TextView
    private lateinit var body: TextView
    private val hideRunnable = Runnable { hideNow() }

    val canShow get() = Settings.canDrawOverlays(ctx)

    private fun dp(v: Int) = (v * ctx.resources.displayMetrics.density).toInt()

    fun show(heading: String, text: String = "") {
        main.removeCallbacks(hideRunnable)
        if (!canShow) return
        if (root == null) {
            title = TextView(ctx).apply {
                setTextColor(0xFFFFFFFF.toInt()); textSize = 13f; typeface = Typeface.DEFAULT_BOLD; alpha = 0.85f
            }
            body = TextView(ctx).apply { setTextColor(0xFFFFFFFF.toInt()); textSize = 18f }
            root = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(20), dp(14), dp(20), dp(16))
                background = GradientDrawable(
                    GradientDrawable.Orientation.TL_BR, intArrayOf(0xF06D3FD6.toInt(), 0xF0E0598B.toInt()),
                ).apply { cornerRadius = dp(24).toFloat() }
                elevation = dp(8).toFloat()
                addView(title); addView(body)
            }
            val lp = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.TOP
                y = dp(48)
                horizontalMargin = 0.04f
            }
            try { wm.addView(root, lp) } catch (_: Exception) { root = null; return }
        }
        title.text = heading
        body.text = text
        body.visibility = if (text.isEmpty()) android.view.View.GONE else android.view.View.VISIBLE
    }

    fun hide(afterMs: Long = 0) {
        main.removeCallbacks(hideRunnable)
        if (afterMs <= 0) hideNow() else main.postDelayed(hideRunnable, afterMs)
    }

    private fun hideNow() {
        root?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        root = null
    }
}
