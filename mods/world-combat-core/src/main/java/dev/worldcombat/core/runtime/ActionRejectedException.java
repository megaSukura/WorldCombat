package dev.worldcombat.core.runtime;

/** Expected gameplay refusal, safe to show as a translated reason without disabling a script. */
public final class ActionRejectedException extends IllegalStateException {
    private final String reason;
    public ActionRejectedException(String reason) { super(reason); this.reason = reason; }
    public String reason() { return reason; }
}
