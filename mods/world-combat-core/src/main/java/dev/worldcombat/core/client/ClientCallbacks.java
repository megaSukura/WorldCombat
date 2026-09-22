package dev.worldcombat.core.client;

import dev.worldcombat.core.WorldCombatCore;
import java.util.function.Consumer;
import java.util.function.Predicate;

/** A failed script callback is isolated until its owner explicitly registers a replacement. */
public final class ClientCallbacks {
    private ClientCallbacks() {}
    private abstract static class Guard {
        boolean failed;
        final void fail(String id, RuntimeException failure) { failed = true; report(id, failure); }
    }
    private static final class ConsumerGuard<T> extends Guard implements Consumer<T> {
        private final String id;
        private final Consumer<T> callback;
        private ConsumerGuard(String id, Consumer<T> callback) { this.id=id; this.callback=callback; }
        public void accept(T value) {
            if (failed) return;
            try { callback.accept(value); }
            catch (RuntimeException failure) { fail(id, failure); }
        }
    }
    private static final class PredicateGuard<T> extends Guard implements Predicate<T> {
        private final String id;
        private final Predicate<T> callback;
        private PredicateGuard(String id, Predicate<T> callback) { this.id=id; this.callback=callback; }
        public boolean test(T value) {
            if (failed) return false;
            try { return callback.test(value); }
            catch (RuntimeException failure) { fail(id, failure); return false; }
        }
    }
    public static boolean active(Object callback) { return callback != null && (!(callback instanceof Guard guard) || !guard.failed); }
    private static void report(String id, RuntimeException failure) {
        WorldCombatCore.LOGGER.error("WorldCombat client callback disabled: {}", id, failure);
        ClientPresentation.reportUiFailure(id, failure.getMessage());
    }
    public static <T> Consumer<T> consumer(String id, Consumer<T> callback) {
        if (callback == null) return null;
        return new ConsumerGuard<>(id, callback);
    }
    public static <T> Predicate<T> predicate(String id, Predicate<T> callback) {
        if (callback == null) return null;
        return new PredicateGuard<>(id, callback);
    }
    public static Runnable runnable(String id, Runnable callback) {
        var guarded = consumer(id, (Object ignored) -> callback.run());
        return () -> guarded.accept(null);
    }
}
