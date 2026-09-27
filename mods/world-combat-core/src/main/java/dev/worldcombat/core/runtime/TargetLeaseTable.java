package dev.worldcombat.core.runtime;

import java.util.*;

/** Finite target requests. A later accepted native request takes ownership of a redirected target. */
public final class TargetLeaseTable<A, T> {
    public interface Port<A, T> {
        boolean valid(A actor);
        T current(A actor);
        boolean restorable(A actor, T target);
        /** Must report native acceptance, including a refused request whose value was already present. */
        boolean request(A actor, T target);
    }
    public record View<T>(long owner, T target, long remaining, boolean active) {}
    private record Lease<T>(long owner, T target, T previous, long until) {}
    private final Port<A, T> port;
    private final Map<A, Lease<T>> leases = new HashMap<>();
    private final Map<Long, Set<A>> retired = new HashMap<>();
    public TargetLeaseTable(Port<A, T> port) { this.port = Objects.requireNonNull(port); }
    private boolean held(A actor, Lease<T> lease) {
        return port.valid(actor) && Objects.equals(port.current(actor), lease.target());
    }
    private void retire(A actor, Lease<T> lease) {
        leases.remove(actor, lease);
        retired.computeIfAbsent(lease.owner(), ignored -> new HashSet<>()).add(actor);
    }
    public boolean acquire(long owner, A actor, T target, int ticks, long now) {
        if (owner == 0 || ticks < 1) throw new IllegalArgumentException("Invalid target lease");
        if (!port.valid(actor) || retired.getOrDefault(owner, Set.of()).contains(actor)) return false;
        var previous = leases.get(actor);
        if (previous != null && previous.owner() == owner) {
            if (previous.until() <= now || !held(actor, previous) || !Objects.equals(previous.target(), target)) return false;
            leases.put(actor, new Lease<>(owner, target, previous.previous(), now + ticks));
            return true;
        }
        T restore = previous != null && held(actor, previous) ? previous.previous() : port.current(actor);
        if (!port.request(actor, target) || !Objects.equals(port.current(actor), target)) return false;
        if (previous != null) retire(actor, previous);
        leases.put(actor, new Lease<>(owner, target, restore, now + ticks));
        return true;
    }
    /** Calm filters only the ordinary target request. Native event listeners still get their normal decision. */
    public T requested(A actor, T target, long now) {
        var lease = leases.get(actor);
        return lease != null && lease.until() > now && lease.target() == null && held(actor, lease) ? null : target;
    }
    public void nativeRequest(A actor, boolean accepted) {
        var lease = leases.get(actor);
        if (accepted && lease != null && (lease.target() != null || !held(actor, lease))) retire(actor, lease);
    }
    public View<T> view(A actor, long now) {
        var lease = leases.get(actor);
        return lease == null ? null : new View<>(lease.owner(), lease.target(), Math.max(0, lease.until() - now),
            lease.until() > now && held(actor, lease));
    }
    public boolean release(long owner, A actor) {
        var lease = leases.get(actor);
        if (lease == null || lease.owner() != owner) return false;
        boolean owns = held(actor, lease);
        retire(actor, lease);
        if (owns) port.request(actor, lease.previous() != null && port.restorable(actor, lease.previous()) ? lease.previous() : null);
        return true;
    }
    public void tick(long now) {
        for (var entry : List.copyOf(leases.entrySet())) {
            var lease = entry.getValue();
            if (lease.until() <= now || !held(entry.getKey(), lease)) release(lease.owner(), entry.getKey());
        }
    }
    public void releaseOwner(long owner) {
        for (var entry : List.copyOf(leases.entrySet())) if (entry.getValue().owner() == owner) release(owner, entry.getKey());
        retired.remove(owner);
    }
    public void stop() {
        for (var entry : List.copyOf(leases.entrySet())) release(entry.getValue().owner(), entry.getKey());
        retired.clear();
    }
}
