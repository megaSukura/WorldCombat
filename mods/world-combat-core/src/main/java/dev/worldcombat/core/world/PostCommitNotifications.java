package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.CombatHost;
import java.util.function.BooleanSupplier;

/** Notifications follow a committed native write; replacement or departure stops the obsolete sequence. */
public final class PostCommitNotifications {
    private PostCommitNotifications() {}
    public static void run(CombatHost host, String content, BooleanSupplier current, Runnable... callbacks) {
        for (int index = 0; index < callbacks.length; index++) {
            try { if (!current.getAsBoolean()) return; }
            catch (RuntimeException error) { host.report(0, content, "Native state committed; notification state check failed", error); return; }
            try { callbacks[index].run(); }
            catch (RuntimeException error) { host.report(0, content, "Native state committed; notification " + index + " failed", error); }
        }
    }
}
