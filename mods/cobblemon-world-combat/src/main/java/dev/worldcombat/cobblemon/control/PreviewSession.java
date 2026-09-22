package dev.worldcombat.cobblemon.control;

/** Device-independent preview transitions; cancellation requires releasing the held modifier before rearming. */
public final class PreviewSession {
    private boolean held;
    private boolean active;
    private boolean blocked;
    private int slot = -1;
    public boolean active() { return active; }
    public int slot() { return slot; }
    public void press() {
        if (!held && !blocked) { active = true; slot = -1; }
        held = true;
    }
    public void select(int slot) {
        if (active && slot >= 0 && slot < 4) this.slot = slot;
    }
    public int release() {
        int selected = active ? slot : -1;
        held = false; active = false; blocked = false; slot = -1;
        return selected;
    }
    public void cancel() { active = false; slot = -1; blocked = held; }
    public void reset() { held = false; active = false; blocked = false; slot = -1; }
}
