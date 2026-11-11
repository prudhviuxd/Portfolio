package app.raga.assistant

import android.content.Context
import android.graphics.BlendMode
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.Shader
import android.os.Build
import android.util.AttributeSet
import android.view.View
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * The glowing, swirling orb on the home screen. Coloured light blobs orbit the centre and are
 * blended additively; how big and fast they move depends on what Raga is doing.
 */
class OrbView @JvmOverloads constructor(ctx: Context, attrs: AttributeSet? = null) : View(ctx, attrs) {

    var phase: UiPhase = UiPhase.OFF
    var level: Float = 0f

    private val colors = intArrayOf(0xFF7B5CFF.toInt(), 0xFFFF4FA3.toInt(), 0xFF33D1FF.toInt(), 0xFFFF8A4C.toInt())
    private val speeds = floatArrayOf(0.9f, -1.3f, 1.7f, -0.7f)
    private val offsets = floatArrayOf(0f, 1.6f, 3.1f, 4.7f)
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        if (Build.VERSION.SDK_INT >= 29) blendMode = BlendMode.PLUS
        else xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)
    }
    private val core = Paint(Paint.ANTI_ALIAS_FLAG)
    private var intensity = 0.3f   // smoothed size
    private var spin = 0f          // smoothed speed
    private var smoothLevel = 0f
    private var t = 0f
    private var last = 0L

    init { setLayerType(LAYER_TYPE_HARDWARE, null) }

    override fun onDraw(canvas: Canvas) {
        val now = System.nanoTime()
        val dt = if (last == 0L) 0.016f else ((now - last) / 1e9f).coerceAtMost(0.05f)
        last = now

        val (targetSize, targetSpin, alpha) = when (phase) {
            UiPhase.OFF -> Triple(0.22f, 0.15f, 0.35f)
            UiPhase.WAITING -> Triple(0.32f + 0.03f * sin(t * 1.5f), 0.5f, 0.85f)
            UiPhase.LISTENING -> Triple(0.42f + 0.25f * smoothLevel, 1.4f, 1f)
            UiPhase.THINKING -> Triple(0.36f, 3.2f, 1f)
            UiPhase.SPEAKING -> Triple(0.40f + 0.06f * sin(t * 6f), 1.8f, 1f)
        }
        smoothLevel += (level - smoothLevel) * min(1f, dt * 10f)
        intensity += (targetSize - intensity) * min(1f, dt * 6f)
        spin += (targetSpin - spin) * min(1f, dt * 3f)
        t += dt * spin

        val cx = width / 2f
        val cy = height / 2f
        val base = min(width, height) / 2f
        val r = base * (0.55f + intensity)
        val orbit = base * 0.18f * (0.6f + intensity)

        for (i in colors.indices) {
            val a = t * speeds[i] + offsets[i]
            val x = cx + cos(a) * orbit
            val y = cy + sin(a * 1.3f) * orbit
            val c = colors[i]
            val withAlpha = (c and 0x00FFFFFF) or ((255 * alpha * 0.85f).toInt() shl 24)
            paint.shader = RadialGradient(x, y, r * 0.75f, intArrayOf(withAlpha, withAlpha and 0x00FFFFFF), null, Shader.TileMode.CLAMP)
            canvas.drawCircle(x, y, r * 0.75f, paint)
        }
        // bright core
        val coreA = (200 * alpha).toInt()
        core.shader = RadialGradient(
            cx, cy, r * 0.42f,
            intArrayOf((coreA shl 24) or 0xFFFFFF, 0x00FFFFFF), null, Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, r * 0.42f, core)

        postInvalidateOnAnimation()
    }
}
