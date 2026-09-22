package dev.worldcombat.cobblemon.control;

/** Per-connection ordering and bounded ingress; all times are server ticks. */
public final class RequestGate {
    private long lastSequence;
    private long window;
    private int count;
    private long inputTick = Long.MIN_VALUE;
    public long lastSequence() { return lastSequence; }
    public String accept(long sequence, long now, long observedTick) {
        return accept(sequence, now, observedTick, false);
    }
    public String accept(long sequence, long now, long observedTick, boolean continuousInput) {
        if (sequence <= lastSequence || sequence < 1) return "old-request";
        lastSequence = sequence;
        if (observedTick > now || now - observedTick > 60) return "stale-request";
        if (continuousInput) {
            if (inputTick == now) return "too-fast";
            inputTick = now; return "";
        }
        if (now - window >= 20) { window = now; count = 0; }
        if (++count > 20) return "too-fast";
        return "";
    }
}
