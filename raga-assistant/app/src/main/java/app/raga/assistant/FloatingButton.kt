package app.raga.assistant

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.PixelFormat
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import kotlin.math.abs

/**
 * A small Raga button that floats over every app (like a chat head). Tap it to talk;
 * drag it anywhere — it snaps to the nearest side. Being visible over other apps is also
 * what lets Raga open apps from the background on recent Android versions.
 */
class FloatingButton(private val ctx: Context, private val onTap: () -> Unit) {
    private val wm = ctx.getSystemService(WindowManager::class.java)
    private var view: View? = null
    private val prefs = Prefs(ctx)

    private fun dp(v: Int) = (v * ctx.resources.displayMetrics.density).toInt()

    @SuppressLint("ClickableViewAccessibility")
    fun show() {
        if (view != null || !Settings.canDrawOverlays(ctx)) return
        val size = dp(56)
        val lp = WindowManager.LayoutParams(
            size, size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = prefs.fabX.takeIf { it >= 0 } ?: (ctx.resources.displayMetrics.widthPixels - size - dp(8))
            y = prefs.fabY.takeIf { it >= 0 } ?: (ctx.resources.displayMetrics.heightPixels / 2)
        }
        val v = ImageView(ctx).apply {
            setImageResource(R.drawable.bg_fab)
            elevation = dp(6).toFloat()
            contentDescription = "Talk to Raga"
            alpha = 0.92f
        }
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0; var moved = false
        v.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX; downY = e.rawY; startX = lp.x; startY = lp.y; moved = false; true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX; val dy = e.rawY - downY
                    if (abs(dx) > dp(6) || abs(dy) > dp(6)) moved = true
                    if (moved) { lp.x = startX + dx.toInt(); lp.y = startY + dy.toInt(); safeUpdate(v, lp) }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) { v.performClick(); onTap() } else {
                        // snap to the closer edge
                        val w = ctx.resources.displayMetrics.widthPixels
                        lp.x = if (lp.x + size / 2 < w / 2) dp(4) else w - size - dp(4)
                        safeUpdate(v, lp)
                        prefs.fabX = lp.x; prefs.fabY = lp.y
                    }
                    true
                }
                else -> false
            }
        }
        try { wm.addView(v, lp); view = v } catch (_: Exception) {}
    }

    private fun safeUpdate(v: View, lp: WindowManager.LayoutParams) {
        try { wm.updateViewLayout(v, lp) } catch (_: Exception) {}
    }

    fun hide() {
        view?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        view = null
    }

    val isShowing get() = view != null
}
