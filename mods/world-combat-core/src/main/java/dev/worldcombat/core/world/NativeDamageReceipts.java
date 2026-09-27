package dev.worldcombat.core.world;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import java.util.concurrent.atomic.AtomicLong;
import java.util.HashSet;
import java.util.Set;

/** Synchronous identity/lifetime of one hurt invocation, including native early returns and exceptions. */
public final class NativeDamageReceipts {
    private NativeDamageReceipts() {}
    private static final AtomicLong IDS = new AtomicLong();
    private static final ThreadLocal<Frame> CURRENT = new ThreadLocal<>();

    static final class Frame {
        final Frame parent;
        final LivingEntity victim;
        final DamageSource cause;
        final String id;
        final double initialHealth;
        final MinecraftCombat combat;
        final MinecraftCombat.DamageTicket ticket;
        final Set<Class<?>> layers = new HashSet<>();
        boolean accepted, cancelled, failed;
        float amount;
        DamageContainer container;
        double childHealth, preparedChildren, before, after, actual = Double.NaN, absorbed;
        String rejection = "";
        Frame(LivingEntity victim, DamageSource cause, float amount) {
            this.parent = CURRENT.get(); this.victim = victim; this.cause = cause;
            this.amount = amount;
            initialHealth = before = after = victim.getHealth();
            combat = victim.level() instanceof ServerLevel level ? CombatServices.get(level.getServer()) : null;
            var prepared = NativePreparedReceipts.take(victim, cause);
            id = prepared == null ? nextId() : prepared.id;
            ticket = prepared == null ? combat == null ? null : combat.openDamageReceipt(victim, cause, amount, id) : prepared.ticket;
            if (prepared != null && ticket != null) {
                ticket.data.addProperty("amount", (double) amount);
                NativeDamageFacts.add(ticket.data, cause, victim, ticket.source.ref());
            }
        }
    }

    public static final class Scope implements AutoCloseable {
        private final Frame frame;
        private final boolean owner;
        private boolean returned, closed;
        private Scope(Frame frame, boolean owner) { this.frame = frame; this.owner = owner; }
        public boolean returned(boolean value) {
            returned = true;
            if (owner) frame.accepted = value;
            return value;
        }
        /** Only the outer virtual invocation substitutes its prepared amount. Super delegates keep their input. */
        public float amount(float original) { return owner ? frame.amount : original; }
        @Override public void close() {
            if (closed) return;
            closed = true;
            if (!owner) return;
            frame.failed = !returned;
            double end = frame.victim.getHealth();
            if (Double.isNaN(frame.actual)) {
                // Custom native hurt paths can change health without actuallyHurt/Post. Nested damage is excluded.
                frame.before = frame.initialHealth;
                frame.after = end;
                frame.actual = Math.max(0, frame.initialHealth - end - frame.childHealth);
            }
            if (CURRENT.get() != frame) throw new IllegalStateException("Damage receipt scopes closed out of order");
            if (frame.parent == null) CURRENT.remove(); else CURRENT.set(frame.parent);
            for (Frame parent = frame.parent; parent != null; parent = parent.parent) {
                if (parent.victim == frame.victim) {
                    parent.childHealth += frame.initialHealth - end;
                    break;
                }
            }
            if (frame.ticket != null) frame.combat.settled(frame);
        }
    }

    /** Each wrapped declaring class enters once per virtual call chain. A first super delegation shares the
     * outer receipt; reentering any already-seen layer starts a new invocation, even with the same cause/body. */
    public static Scope enter(LivingEntity victim, DamageSource cause, float amount, Class<?> declaringClass) {
        var current = CURRENT.get();
        if (current != null && current.victim == victim && current.cause == cause && current.layers.add(declaringClass)) {
            return new Scope(current, false);
        }
        var frame = new Frame(victim, cause, amount); frame.layers.add(declaringClass); CURRENT.set(frame);
        var scope = new Scope(frame, true);
        try {
            if (frame.ticket != null) frame.combat.prepareDamage(frame);
            return scope;
        } catch (RuntimeException | Error failure) { scope.close(); throw failure; }
    }
    static Frame current(LivingEntity victim, DamageSource cause) {
        var frame = CURRENT.get();
        return frame != null && frame.victim == victim && frame.cause == cause ? frame : null;
    }
    static String active(MinecraftCombat combat) {
        var frame = CURRENT.get();
        var prepared = NativePreparedReceipts.active(combat, frame);
        if (!prepared.isEmpty()) return prepared;
        return frame != null && frame.combat == combat && frame.ticket != null ? frame.id : "";
    }
    static String nextId() { return "hurt:" + IDS.incrementAndGet(); }
    static Frame current() { return CURRENT.get(); }
    public static void incoming(LivingEntity victim, DamageContainer container) {
        var frame = current(victim, container.getSource());
        if (frame != null) frame.container = container;
    }
    public static void incomingEnded(LivingEntity victim, DamageContainer container, boolean cancelled) {
        var frame = current(victim, container.getSource());
        if (frame != null && frame.container == container) frame.cancelled = cancelled;
    }
    /** Runs after every Pre listener, immediately before native absorption/HP application. */
    public static void prepared(LivingEntity victim, DamageContainer container) {
        var frame = current(victim, container.getSource());
        if (frame != null && frame.container == container) {
            frame.before = victim.getHealth(); frame.preparedChildren = frame.childHealth;
        }
    }
    /** Runs before Post listeners can cause another hit, heal or a totem can restore HP. */
    public static void applied(LivingEntity victim, DamageContainer container) {
        var frame = current(victim, container.getSource());
        if (frame != null && frame.container == container) {
            frame.after = victim.getHealth();
            frame.actual = Math.max(0, frame.before - frame.after - (frame.childHealth - frame.preparedChildren));
            frame.absorbed = Math.max(0, container.getReduction(DamageContainer.Reduction.ABSORPTION));
        }
    }
}
