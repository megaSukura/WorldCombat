package dev.worldcombat.core.runtime;

import java.util.*;
import java.util.function.*;
import dev.worldcombat.core.runtime.effect.EffectData;

/** Shared native-flight ownership and safe-boundary dispatch for actions and named effect handlers. */
public final class ManagedProjectiles {
    private final CombatHost host;
    private final ActionRuntime runtime;
    private static final class Flight {
        String id;
        long owner;
        ActorHandle source;
        UUID controller;
        BooleanSupplier live;
        BiConsumer<String, Impact> hit;
        Consumer<String> complete;
        boolean completed;
    }
    private record Delivery(Flight flight, Impact impact) {}
    private final Map<String, Flight> flights = new LinkedHashMap<>();
    private final List<Delivery> pending = new ArrayList<>();
    private final Map<Impact, Flight> receipts = new IdentityHashMap<>();
    ManagedProjectiles(ActionRuntime runtime) { this.runtime = runtime; this.host = runtime.host; }

    public String spawn(long owner, ActorHandle source, UUID controller, BooleanSupplier live,
                        Point origin, Point velocity, double gravity, double radius, double range, int lifetime,
                        BiConsumer<String, Impact> hit, Consumer<String> complete, String appearance) {
        host.checkThread();
        if (owner == 0 || !live.getAsBoolean()) throw new ActionInactiveException("Projectile needs a live lifecycle owner");
        if (origin == null || velocity == null || !Double.isFinite(origin.length()) || !Double.isFinite(velocity.length()) || velocity.length() <= 0
            || !Double.isFinite(gravity) || gravity < 0 || gravity > Float.MAX_VALUE || !Double.isFinite(radius) || radius < 0 || radius > Float.MAX_VALUE
            || !Double.isFinite(range) || range <= 0 || lifetime < 1 || hit == null || complete == null)
            throw new IllegalArgumentException("Invalid projectile geometry or handlers");
        if (origin.minus(host.position(source)).length() > 64) throw new ActionRejectedException("out-of-range");
        var flight = new Flight(); flight.owner = owner; flight.source = source; flight.controller = controller;
        flight.live = live; flight.hit = hit; flight.complete = complete;
        flight.id = host.projectile(owner, source, controller, origin, velocity, gravity, radius, range, lifetime,
            impact -> { if (!flight.completed) pending.add(new Delivery(flight, impact)); },
            () -> { if (!flight.completed) { flight.completed = true; pending.add(new Delivery(flight, null)); } },
            EffectData.copy(appearance));
        flights.put(flight.id, flight);
        if (!live(flight)) { remove(flight); throw new ActionInactiveException("Projectile owner ended during native spawn"); }
        return flight.id;
    }
    private boolean live(Flight flight) {
        return flights.get(flight.id) == flight && flight.live.getAsBoolean()
            && host.valid(flight.source) && host.mayAct(flight.source, flight.controller);
    }
    /** Only a receipt issued to this owner, during its hit callback, may settle native projectile damage. */
    public boolean hit(long owner, Impact impact, double amount, String metadata) {
        host.checkThread(); if (amount == 0) return false; NativeAmounts.positive(amount); metadata = EffectData.copy(metadata);
        var flight = receipts.get(impact);
        if (flight == null || flight.owner != owner || !live(flight) || !impact.hitEntity()) return false;
        receipts.remove(impact);
        return host.projectileDamage(owner, flight.source, flight.controller, impact, amount, metadata, runtime.origin(owner));
    }
    public boolean active(long owner, String id) { host.checkThread(); var flight = flights.get(id); return flight != null && flight.owner == owner && live(flight) && !flight.completed; }
    public boolean cancel(long owner, String id) {
        host.checkThread(); var flight = flights.get(id);
        if (flight == null || flight.owner != owner) return false;
        remove(flight); return true;
    }
    public boolean finish(long owner, String id) {
        host.checkThread(); var flight = flights.get(id);
        if (flight == null || flight.owner != owner || !live(flight) || flight.completed) return false;
        flight.completed = true; host.stopProjectile(owner, id);
        pending.add(new Delivery(flight, null)); return true;
    }
    private void remove(Flight flight) {
        flights.remove(flight.id, flight); flight.completed = true;
        pending.removeIf(item -> item.flight == flight);
        receipts.entrySet().removeIf(item -> item.getValue() == flight);
        host.removeProjectile(flight.owner, flight.id);
    }
    public void release(long owner) {
        host.checkThread(); for (var flight : List.copyOf(flights.values())) if (flight.owner == owner) remove(flight);
    }
    void tick() {
        host.checkThread();
        for (var flight : List.copyOf(flights.values())) if (!live(flight)) remove(flight);
        var batch = List.copyOf(pending); pending.clear();
        for (var item : batch) {
            var flight = item.flight;
            if (!live(flight)) { if (flights.get(flight.id) == flight) remove(flight); continue; }
            try {
                if (item.impact == null) flight.complete.accept(flight.id);
                else {
                    receipts.put(item.impact, flight);
                    flight.hit.accept(flight.id, item.impact);
                }
            } finally {
                receipts.remove(item.impact);
                if (item.impact == null) remove(flight);
            }
        }
    }
    public int size() { return flights.size(); }
}
