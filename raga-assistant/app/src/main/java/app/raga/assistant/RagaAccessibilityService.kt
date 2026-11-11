package app.raga.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Lets Raga operate any app by voice: press buttons by their label ("click send"),
 * type into text boxes, scroll, go home/back, lock the screen and take screenshots.
 * Enabled by the user in Settings > Accessibility > Raga.
 */
class RagaAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() { instance = this }
    override fun onDestroy() { if (instance === this) instance = null; super.onDestroy() }
    override fun onUnbind(intent: android.content.Intent?): Boolean {
        if (instance === this) instance = null
        return super.onUnbind(intent)
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    fun global(action: GlobalAction): Boolean {
        if (Build.VERSION.SDK_INT < 28 && (action == GlobalAction.LOCK || action == GlobalAction.SCREENSHOT)) return false
        return performGlobalAction(when (action) {
            GlobalAction.HOME -> GLOBAL_ACTION_HOME
            GlobalAction.BACK -> GLOBAL_ACTION_BACK
            GlobalAction.RECENTS -> GLOBAL_ACTION_RECENTS
            GlobalAction.NOTIFICATIONS -> GLOBAL_ACTION_NOTIFICATIONS
            GlobalAction.QUICK_SETTINGS -> GLOBAL_ACTION_QUICK_SETTINGS
            GlobalAction.LOCK -> GLOBAL_ACTION_LOCK_SCREEN
            GlobalAction.SCREENSHOT -> GLOBAL_ACTION_TAKE_SCREENSHOT
        })
    }

    private fun allNodes(): List<AccessibilityNodeInfo> {
        val out = ArrayList<AccessibilityNodeInfo>()
        val roots = windows.mapNotNull { it.root }.ifEmpty { listOfNotNull(rootInActiveWindow) }
        fun walk(n: AccessibilityNodeInfo?) {
            if (n == null) return
            out += n
            for (i in 0 until n.childCount) walk(n.getChild(i))
        }
        roots.forEach { walk(it) }
        return out
    }

    private fun labelOf(n: AccessibilityNodeInfo): String =
        (n.text ?: n.contentDescription ?: (if (Build.VERSION.SDK_INT >= 26) n.hintText else null) ?: "").toString()

    /** Tap the on-screen element whose text or description best matches what was said. */
    fun clickByText(spoken: String): Boolean {
        val candidates = allNodes().filter { it.isVisibleToUser && labelOf(it).isNotBlank() }
        val best = Fuzzy.best(spoken, candidates) { labelOf(it) } ?: return false
        if (best.score < 0.6) return false
        return click(best.item)
    }

    private fun click(node: AccessibilityNodeInfo): Boolean {
        var n: AccessibilityNodeInfo? = node
        while (n != null) {
            if (n.isClickable && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            n = n.parent
        }
        // nothing clickable in the hierarchy: tap the centre of the element
        val r = Rect().also { node.getBoundsInScreen(it) }
        return tap(r.exactCenterX(), r.exactCenterY())
    }

    private fun tap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val g = GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path, 0, 60)).build()
        return dispatchGesture(g, null, null)
    }

    fun typeText(text: String): Boolean {
        val target = findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: allNodes().firstOrNull { it.isEditable && it.isVisibleToUser }
            ?: return false
        val existing = if (target.isShowingHintTextCompat()) "" else (target.text ?: "").toString()
        val joined = if (existing.isBlank()) text else "$existing $text"
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, joined)
        }
        return target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    private fun AccessibilityNodeInfo.isShowingHintTextCompat() =
        Build.VERSION.SDK_INT >= 26 && isShowingHintText

    fun scroll(down: Boolean) {
        val scrollable = allNodes().filter { it.isScrollable && it.isVisibleToUser }
            .maxByOrNull { Rect().also { r -> it.getBoundsInScreen(r) }.let { r -> r.width() * r.height() } }
        val action = if (down) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        if (scrollable?.performAction(action) == true) return
        // fallback: swipe gesture in the middle of the screen
        val dm = resources.displayMetrics
        val x = dm.widthPixels / 2f
        val (y1, y2) = if (down) dm.heightPixels * 0.7f to dm.heightPixels * 0.3f else dm.heightPixels * 0.3f to dm.heightPixels * 0.7f
        val path = Path().apply { moveTo(x, y1); lineTo(x, y2) }
        dispatchGesture(GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path, 0, 300)).build(), null, null)
    }

    /** Press WhatsApp's send button once a chat opened from a link has loaded. */
    fun clickWhatsAppSend(): Boolean {
        // Only ever press Send inside WhatsApp itself, never in whatever app happens to be on screen.
        val root = rootInActiveWindow ?: return false
        val pkg = root.packageName?.toString() ?: return false
        if (pkg != "com.whatsapp" && pkg != "com.whatsapp.w4b") return false
        root.findAccessibilityNodeInfosByViewId("$pkg:id/send").firstOrNull()?.let { return click(it) }
        // WhatsApp renamed the button: look for "Send" inside WhatsApp's own window only
        fun find(n: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
            if (n == null) return null
            if (labelOf(n).equals("Send", ignoreCase = true)) return n
            for (i in 0 until n.childCount) find(n.getChild(i))?.let { return it }
            return null
        }
        return find(root)?.let { click(it) } ?: false
    }

    companion object {
        @Volatile var instance: RagaAccessibilityService? = null
    }
}
