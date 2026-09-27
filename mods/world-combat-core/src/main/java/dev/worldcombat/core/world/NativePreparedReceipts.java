package dev.worldcombat.core.world;

import com.google.gson.JsonParser;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.neoforged.neoforge.event.entity.player.CriticalHitEvent;

/** A real Player.attack may reserve its main hurt before the native critical event is posted once.
 * Only the exact main-hurt call site can adopt it; nested damage and sweeping retain separate identities. */
public final class NativePreparedReceipts {
    private NativePreparedReceipts() {}
    private static final ThreadLocal<Attempt> CURRENT = new ThreadLocal<>();
    private static final ThreadLocal<Attempt> PREPARING = new ThreadLocal<>();

    static final class Attempt {
        final Attempt parent;
        final Player player;
        final Entity target;
        String id;
        DamageSource cause;
        MinecraftCombat combat;
        MinecraftCombat.DamageTicket ticket;
        NativeDamageReceipts.Frame enclosing;
        CriticalHitEvent event;
        boolean criticalCall, armed, adopted, finished;
        Attempt(Player player, Entity target) { parent = CURRENT.get(); this.player = player; this.target = target; }
        void finish(boolean failed, String reason) {
            if (finished || adopted || ticket == null) return;
            finished = true;
            combat.settledPrepared(ticket, (LivingEntity) target, failed, reason);
        }
    }
    public static final class Attack implements AutoCloseable {
        private final Attempt attempt;
        private boolean returned;
        private Attack(Attempt attempt) { this.attempt = attempt; }
        public void returned() { returned = true; }
        @Override public void close() {
            if (CURRENT.get() != attempt) throw new IllegalStateException("Prepared attacks closed out of order");
            if (attempt.parent == null) CURRENT.remove(); else CURRENT.set(attempt.parent);
            attempt.finish(!returned, "");
        }
    }
    public static Attack attack(Player player, Entity target) {
        var attempt = new Attempt(player, target); CURRENT.set(attempt); return new Attack(attempt);
    }
    /** A gate at Player.attack's actual fireCriticalHit invocation, not at arbitrary externally posted events. */
    public static AutoCloseable criticalCall(Player player, Entity target, DamageSource cause) {
        var attempt = CURRENT.get();
        if (attempt == null || attempt.player != player || attempt.target != target || attempt.event != null) return () -> {};
        attempt.cause = cause; attempt.criticalCall = true;
        return () -> attempt.criticalCall = false;
    }
    public static void prepare(CriticalHitEvent event) {
        var attempt = CURRENT.get();
        if (attempt == null || !attempt.criticalCall || attempt.event != null || attempt.player != event.getEntity()
            || attempt.target != event.getTarget() || !(attempt.target instanceof LivingEntity target)
            || !(attempt.player.level() instanceof ServerLevel level)) return;
        attempt.event = event;
        attempt.combat = CombatServices.get(level.getServer());
        attempt.id = NativeDamageReceipts.nextId();
        attempt.ticket = attempt.combat.openDamageReceipt(target, attempt.cause, 0, attempt.id);
        if (attempt.ticket == null) return;
        if (!attempt.ticket.source.entity().equals(attempt.player.getUUID())) { attempt.ticket = null; return; }
        NativeAttackStarts.melee(attempt.player, attempt.target, attempt.id);
        var data = attempt.ticket.data;
        NativeCriticals.facts(data, event);
        data.addProperty("prepared", true); data.addProperty("category", "physical"); data.addProperty("contact", true);
        var previous = PREPARING.get();
        attempt.enclosing = NativeDamageReceipts.current(); PREPARING.set(attempt);
        try {
            var result = attempt.combat.runtime().event("world_combat:critical_prepare", attempt.ticket.source,
                attempt.ticket.target, data.toString(), true, attempt.ticket.origin);
            var updated = JsonParser.parseString(result.data()).getAsJsonObject();
            updated.addProperty("receiptId", attempt.id); updated.addProperty("prepared", true);
            attempt.ticket.data = updated;
            if (!result.rejection().isEmpty()) event.setCriticalHit(false);
            else NativeCriticals.update(event, updated);
        } finally { if (previous == null) PREPARING.remove(); else PREPARING.set(previous); }
    }
    /** The event bus has returned its final decision. A denial releases the reservation synchronously. */
    public static void decided(CriticalHitEvent event) {
        var attempt = CURRENT.get();
        if (attempt == null || attempt.event != event || attempt.ticket == null) return;
        var data = attempt.ticket.data;
        NativeCriticals.facts(data, event);
        data.addProperty("nativeCriticalPrepared", true);
        data.addProperty("criticalMultiplier", event.isCriticalHit() ? (double) event.getDamageMultiplier() : 1.0);
        if (!event.isCriticalHit()) attempt.finish(false, "critical-denied");
    }
    public static AutoCloseable mainHurt(Entity target, DamageSource cause) {
        var attempt = CURRENT.get();
        if (attempt == null || attempt.target != target || attempt.cause != cause || attempt.finished || attempt.adopted
            || attempt.ticket == null || attempt.event == null || !attempt.event.isCriticalHit()) return () -> {};
        attempt.armed = true;
        return () -> attempt.armed = false;
    }
    static Attempt take(LivingEntity target, DamageSource cause) {
        var attempt = CURRENT.get();
        if (attempt == null || !attempt.armed || attempt.target != target || attempt.cause != cause) return null;
        attempt.armed = false; attempt.adopted = true;
        return attempt;
    }
    static String active(MinecraftCombat combat, NativeDamageReceipts.Frame current) {
        var attempt = PREPARING.get();
        return attempt != null && !attempt.finished && attempt.combat == combat && attempt.ticket != null
            && attempt.enclosing == current ? attempt.id : "";
    }
}
