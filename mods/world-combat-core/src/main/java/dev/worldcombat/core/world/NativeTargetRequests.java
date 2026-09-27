package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.neoforged.neoforge.event.entity.living.LivingChangeTargetEvent;
import java.util.*;
import java.util.function.Consumer;

/** Owned requests to Mob.setTarget. Brain attack memories and custom boss attack schedulers are separate capabilities. */
public final class NativeTargetRequests {
    private static final class Request {
        final Mob mob; final boolean internal;
        boolean entered, accepted;
        Request(Mob mob, boolean internal) { this.mob = mob; this.internal = internal; }
    }
    private static final class Frame {
        final Mob mob; final Request request;
        LivingChangeTargetEvent event;
        Frame(Mob mob, Request request) { this.mob = mob; this.request = request; }
    }
    private static final ThreadLocal<Deque<Request>> REQUESTS = ThreadLocal.withInitial(ArrayDeque::new);
    private static final ThreadLocal<Deque<Frame>> FRAMES = ThreadLocal.withInitial(ArrayDeque::new);
    private final MinecraftCombat combat;
    private final TargetLeaseTable<Mob, LivingEntity> leases;
    public NativeTargetRequests(MinecraftCombat combat) {
        this.combat = combat;
        leases = new TargetLeaseTable<>(new TargetLeaseTable.Port<>() {
            public boolean valid(Mob actor) { return actor.isAlive() && !actor.isRemoved() && actor.level() instanceof ServerLevel; }
            public LivingEntity current(Mob actor) { return actor.getTarget(); }
            public boolean restorable(Mob actor, LivingEntity target) {
                return acceptable(actor, target);
            }
            public boolean request(Mob actor, LivingEntity target) { return NativeTargetRequests.request(actor, target, true); }
        });
    }
    private static boolean acceptable(Mob actor, LivingEntity target) {
        return target.isAlive() && !target.isRemoved() && target.level() == actor.level() && target != actor
            && !actor.isAlliedTo(target) && !CombatServices.domain(actor).friendly(actor, target)
            && !CombatServices.domain(target).friendly(target, actor) && actor.canAttack(target);
    }
    private static NativeTargetRequests service(Mob mob) {
        if (!(mob.level() instanceof ServerLevel level)) return null;
        var combat = CombatServices.existing(level.getServer());
        return combat == null ? null : combat.targetRequests();
    }
    /** The event receipt distinguishes a refused no-op (including null -> null) from an accepted request. */
    public static boolean request(Mob mob, LivingEntity target, boolean internal) {
        var pending = new Request(mob, internal); var requests = REQUESTS.get(); requests.push(pending);
        try { mob.setTarget(target); return pending.entered && pending.accepted && mob.getTarget() == target; }
        finally { requests.pop(); if (requests.isEmpty()) REQUESTS.remove(); }
    }
    public static void around(Mob mob, LivingEntity target, Consumer<LivingEntity> original) {
        var requests = REQUESTS.get(); var pending = requests.peek();
        if (pending != null && (pending.entered || pending.mob != mob)) pending = null;
        if (pending != null) pending.entered = true;
        var frame = new Frame(mob, pending); var frames = FRAMES.get(); frames.push(frame);
        var service = service(mob); boolean internal = pending != null && pending.internal;
        var wanted = !internal && service != null ? service.leases.requested(mob, target, service.combat.runtime().now()) : target;
        boolean returned = false;
        try { original.accept(wanted); returned = true; }
        finally {
            boolean accepted = returned && frame.event != null && !frame.event.isCanceled()
                && mob.getTarget() == frame.event.getNewAboutToBeSetTarget();
            if (pending != null) pending.accepted = accepted;
            if (!internal && service != null) service.leases.nativeRequest(mob, accepted);
            frames.pop(); if (frames.isEmpty()) FRAMES.remove();
            if (requests.isEmpty()) REQUESTS.remove();
        }
    }
    /** Captured after NeoForge dispatch; its cancellation and selected result remain authoritative. */
    public static void event(Mob mob, LivingChangeTargetEvent event) {
        var frame = FRAMES.get().peek(); if (frame != null && frame.mob == mob) frame.event = event;
    }
    public boolean acquire(long owner, ActorHandle actor, ActorHandle target, int ticks) {
        combat.checkThread();
        if (!(combat.resolve(actor) instanceof Mob mob)) return false;
        var wanted = target == null ? null : combat.resolve(target);
        if (target != null && (wanted == null || !acceptable(mob, wanted))) return false;
        return leases.acquire(owner, mob, wanted, ticks, combat.runtime().now());
    }
    public String state(long owner, ActorHandle actor) {
        combat.checkThread(); var json = new JsonObject(); json.addProperty("active", false); json.addProperty("owned", false);
        if (!(combat.resolve(actor) instanceof Mob mob)) return json.toString();
        var view = leases.view(mob, combat.runtime().now()); if (view == null) return json.toString();
        json.addProperty("active", view.active()); json.addProperty("owned", view.owner() == owner);
        json.addProperty("mode", view.target() == null ? "calm" : "redirect");
        json.addProperty("target", view.target() == null ? "" : combat.bind(view.target()).ref());
        json.addProperty("remaining", view.remaining()); return json.toString();
    }
    public boolean release(long owner, ActorHandle actor) {
        combat.checkThread(); return combat.resolve(actor) instanceof Mob mob && leases.release(owner, mob);
    }
    public void release(long owner) { leases.releaseOwner(owner); }
    public void tick() { leases.tick(combat.runtime().now()); }
    public void stop() { leases.stop(); }
}
