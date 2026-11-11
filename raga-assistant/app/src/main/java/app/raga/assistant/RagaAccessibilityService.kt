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
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    /** The last real app that was on screen (not Raga, the launcher, the keyboard or system UI). */
    @Volatile var lastApp: String? = null
        private set

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName || pkg == "com.android.systemui" || pkg == homePackage() || pkg.contains("inputmethod") ||
            pkg.contains("keyboard")
        ) return
        lastApp = pkg
    }

    private fun homePackage(): String? = try {
        val i = android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_HOME)
        packageManager.resolveActivity(i, 0)?.activityInfo?.packageName
    } catch (_: Exception) { null }

    private fun swipeUp(r: Rect, onDone: () -> Unit = {}) {
        val path = Path().apply { moveTo(r.exactCenterX(), r.exactCenterY()); lineTo(r.exactCenterX(), 20f) }
        val g = GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path, 0, 220)).build()
        dispatchGesture(g, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) = onDone()
            override fun onCancelled(gestureDescription: GestureDescription?) = onDone()
        }, null)
    }

    /**
     * Close one app the way a person would: open the recent-apps screen and swipe its card
     * away (or use the card's own "dismiss" action when the launcher offers one).
     */
    fun closeApp(label: String, onResult: (Boolean) -> Unit) {
        performGlobalAction(GLOBAL_ACTION_RECENTS)
        handler.postDelayed({
            val nodes = allNodes().filter { it.isVisibleToUser && labelOf(it).isNotBlank() }
            val match = Fuzzy.best(label, nodes) { labelOf(it) }?.takeIf { it.score >= 0.7 }?.item
            if (match == null) {
                performGlobalAction(GLOBAL_ACTION_HOME)
                onResult(false); return@postDelayed
            }
            // a "dismiss"/"remove"/"close" accessibility action on the card or its parents?
            var n: AccessibilityNodeInfo? = match
            while (n != null) {
                val act = n.actionList.firstOrNull { a ->
                    val l = a.label?.toString()?.lowercase() ?: ""
                    a.id == AccessibilityNodeInfo.AccessibilityAction.ACTION_DISMISS.id ||
                        l.contains("dismiss") || l.contains("remove") || (l.contains("close") && !l.contains("all"))
                }
                if (act != null && n.performAction(act.id)) {
                    handler.postDelayed({ performGlobalAction(GLOBAL_ACTION_HOME); onResult(true) }, 500)
                    return@postDelayed
                }
                n = n.parent
            }
            // otherwise swipe the card up and away
            var card: AccessibilityNodeInfo = match
            while (card.parent != null && Rect().also { card.getBoundsInScreen(it) }.height() < resources.displayMetrics.heightPixels / 4) {
                card = card.parent
            }
            val r = Rect().also { card.getBoundsInScreen(it) }
            swipeUp(r) { handler.postDelayed({ performGlobalAction(GLOBAL_ACTION_HOME); onResult(true) }, 400) }
        }, 900)
    }

    /** Press the recent-apps screen's "Clear all" / "Close all" button. */
    fun closeAll(onResult: (Boolean) -> Unit) {
        performGlobalAction(GLOBAL_ACTION_RECENTS)
        val words = listOf("clear all", "close all", "clear", "dismiss all", "remove all", "clear everything")
        fun findButton(): AccessibilityNodeInfo? = allNodes().firstOrNull { n ->
            val l = labelOf(n).lowercase().trim()
            n.isVisibleToUser && words.any { l == it }
        }
        fun attempt(step: Int) {
            findButton()?.let { if (click(it)) { onResult(true); return } }
            if (step >= 8) {
                // no button: swipe the cards away one by one
                var left = 12
                fun swipeNext() {
                    if (left-- <= 0) { performGlobalAction(GLOBAL_ACTION_HOME); onResult(true); return }
                    val dm = resources.displayMetrics
                    swipeUp(Rect(0, dm.heightPixels / 4, dm.widthPixels, dm.heightPixels * 3 / 4)) { handler.postDelayed({ swipeNext() }, 350) }
                }
                swipeNext(); return
            }
            // "Clear all" usually sits at one end of the list: scroll toward it
            val list = allNodes().filter { it.isScrollable && it.isVisibleToUser }.maxByOrNull {
                Rect().also { r -> it.getBoundsInScreen(r) }.let { r -> r.width() * r.height() }
            }
            val dir = if (step < 4) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            list?.performAction(dir)
            handler.postDelayed({ attempt(step + 1) }, 350)
        }
        handler.postDelayed({ attempt(0) }, 900)
    }
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
