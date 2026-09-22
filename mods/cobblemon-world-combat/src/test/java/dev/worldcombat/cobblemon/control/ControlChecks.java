package dev.worldcombat.cobblemon.control;

public final class ControlChecks {
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    public static void main(String[] args) {
        var preview = new PreviewSession();
        preview.press();
        check(preview.release() == -1, "Unselected release cast a skill");
        preview.press(); preview.select(2);
        check(preview.release() == 2 && preview.release() == -1, "Confirmation was lost or duplicated");
        preview.press(); preview.select(1); preview.cancel(); preview.press(); preview.select(3);
        check(preview.release() == -1, "Cancelled held modifier rearmed");
        preview.press(); preview.select(0);
        check(preview.release() == 0, "Release did not unlock a fresh preview");
        preview.press(); preview.select(0); preview.select(3);
        check(preview.release() == 3, "Latest selected skill did not replace the previous skill");
        System.out.println("PASS preview selection, confirmation, cancellation, held keys and rearming");

        var gate = new RequestGate();
        check(gate.accept(1, 100, 100).isEmpty(), "Fresh request rejected");
        check(gate.accept(1, 100, 100).equals("old-request"), "Duplicate request accepted");
        check(gate.accept(0, 100, 100).equals("old-request"), "Reordered request accepted");
        check(gate.accept(2, 100, 39).equals("stale-request"), "Expired request accepted");
        check(gate.accept(3, 100, 101).equals("stale-request"), "Future timestamp accepted");
        for (long seq = 4; seq < 23; seq++) check(gate.accept(seq, 100, 100).isEmpty(), "Valid ingress budget rejected");
        check(gate.accept(23, 100, 100).equals("too-fast"), "Flood exceeded ingress limit");
        check(gate.accept(24, 120, 120).isEmpty(), "Ingress budget failed to refill");
        check(gate.lastSequence() == 24, "Response correlation lost");
        var continuous = new RequestGate(); long sequence = 0;
        for (long tick = 100; tick < 140; tick++) {
            check(continuous.accept(++sequence, tick, tick, true).isEmpty(), "Per-tick aim was throttled");
            if (tick == 110) {
                check(continuous.accept(++sequence, tick, tick, true).equals("too-fast"), "Duplicate aim in one tick accepted");
                check(continuous.accept(++sequence, tick, tick).isEmpty(), "Aim traffic blocked cancellation");
            }
        }
        System.out.println("PASS request ordering, replay, freshness, correlation and ingress budget");

        var skill = new dev.worldcombat.cobblemon.network.ControlState.Skill("checks:a", "1", "point", 16, 10, true, "checks:a", 3, 4, "", dev.worldcombat.core.runtime.ActionPreview.EMPTY);
        var state = new dev.worldcombat.cobblemon.network.ControlState(java.util.UUID.randomUUID(), 2, 1, 100,
            java.util.UUID.randomUUID(), 1, 4, 0, "Actor", "custom_stage", "", "", "", 0, 16, java.util.UUID.randomUUID(),
            java.util.Collections.nCopies(4, skill), java.util.List.of(), "{}", 91);
        var buffer = new net.minecraft.network.RegistryFriendlyByteBuf(io.netty.buffer.Unpooled.buffer(), net.minecraft.core.RegistryAccess.EMPTY);
        try {
            dev.worldcombat.cobblemon.network.ControlState.CODEC.encode(buffer, state);
            check(dev.worldcombat.cobblemon.network.ControlState.CODEC.decode(buffer).equals(state), "Control state lost its input owner on the wire");
            check(state.atTick(102).inputToken() == 91 && state.atTick(102).skills().getFirst().cooldown() == 8,
                "Countdown projection changed sustained input ownership");
        } finally { buffer.release(); }
        System.out.println("PASS input-owner token codec and countdown projection independent of foreground stage names");
    }
}
