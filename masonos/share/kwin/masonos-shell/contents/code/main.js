// MasonOS Shell — window behaviour for a GNOME-shaped desktop.
//
// Every entry point is feature-detected: if a KWin build does not expose a slot
// the shortcut simply does nothing instead of breaking the script. Overview
// (Meta+W) and the application grid (Meta) are stock Plasma shortcuts.

function masonShortcut(name, text, shortcut, action) {
    try {
        registerShortcut(name, text, shortcut, action);
    } catch (error) {
        // older KWin: skip this binding
    }
}

function slot(name) {
    return function () {
        var fn = workspace[name];
        if (typeof fn === "function") {
            fn.call(workspace);
        }
    };
}

masonShortcut("MasonOS Tile Left", "MasonOS: tile window left", "Meta+Alt+Left", slot("slotWindowQuickTileLeft"));
masonShortcut("MasonOS Tile Right", "MasonOS: tile window right", "Meta+Alt+Right", slot("slotWindowQuickTileRight"));
masonShortcut("MasonOS Maximize", "MasonOS: toggle maximize", "Meta+Alt+Up", slot("slotWindowMaximize"));
masonShortcut("MasonOS Show Desktop", "MasonOS: show desktop", "Meta+Shift+D", slot("slotToggleShowDesktop"));
