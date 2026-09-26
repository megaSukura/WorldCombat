package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.ActorHandle;
import java.util.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;

/** Final death observations. The cancelable request is checked again after native death processing. */
public final class NativeDeathFacts {
    private record Observer(ActorHandle actor, boolean friendly, boolean self) {}
    private record Pending(LivingDeathEvent request, ActorHandle target, JsonObject facts, List<Observer> observers) {}
    private final MinecraftCombat combat;
    private final ArrayDeque<Pending> pending = new ArrayDeque<>();
    private final WeakHashMap<LivingEntity, Boolean> reported = new WeakHashMap<>();
    private long epoch = -1, sequence;
    NativeDeathFacts(MinecraftCombat combat) { this.combat = combat; }
    public static void observe(LivingDeathEvent event) {
        if (event.getEntity().level() instanceof ServerLevel level)
            CombatServices.get(level.getServer()).deaths().enqueue(event);
    }
    private void current() {
        if (epoch != CombatServices.CONTENT.epoch()) { clear(); epoch = CombatServices.CONTENT.epoch(); }
    }
    public void enqueue(LivingDeathEvent event) {
        combat.checkThread(); current();
        if (event.isCanceled() || !CombatServices.CONTENT.ready() || !CombatServices.CONTENT.hooks().has("world_combat:actor_died")) return;
        var victim = event.getEntity();
        if (!(victim.level() instanceof ServerLevel level)) return;
        var target = combat.bind(victim); var data = new JsonObject();
        data.addProperty("victim", target.ref()); data.addProperty("identity", target.domain() + ":" + target.identity());
        data.addProperty("entity", victim.getStringUUID()); data.addProperty("dimension", level.dimension().location().toString());
        data.addProperty("tick", combat.runtime().now());
        var at = victim.getBoundingBox().getCenter(); var position = new JsonArray();
        position.add(at.x); position.add(at.y); position.add(at.z); data.add("position", position);
        var source = event.getSource().getEntity();
        data.addProperty("sourceEntity", source == null ? "" : source.getStringUUID());
        data.addProperty("sourceActor", source instanceof LivingEntity living && CombatServices.domain(living).available(living) ? combat.bind(living).ref() : "");
        var attacking = victim instanceof Mob mob ? mob.getTarget() : victim.getLastHurtMob();
        data.addProperty("attackingEntity", attacking == null ? "" : attacking.getStringUUID());
        var previous = victim.getLastHurtByMob();
        data.addProperty("lastAttackerEntity", previous == null ? "" : previous.getStringUUID());
        var observers = new ArrayList<Observer>();
        for (var observer : combat.deathObservers(level)) observers.add(new Observer(observer,
            combat.friendlySnapshot(observer, target), observer.equals(target)));
        pending.addLast(new Pending(event, target, data, List.copyOf(observers)));
    }
    public void flush() {
        combat.checkThread(); current();
        // An actual revival opens a new death cycle for this same native object.
        reported.keySet().removeIf(entity -> entity.isAlive() && !entity.isRemoved());
        int ready = pending.size();
        while (ready-- > 0) {
            var next = pending.removeFirst();
            var victim = next.request().getEntity();
            if (next.request().isCanceled() || !victim.isDeadOrDying() || victim.getHealth() > 0 || reported.containsKey(victim)) continue;
            reported.put(victim, true);
            var facts = next.facts(); facts.addProperty("deathId", "death:" + epoch + ":" + (++sequence));
            for (var observer : next.observers()) {
                if (observer.self() || !combat.valid(observer.actor())) continue;
                var data = facts.deepCopy(); data.addProperty("friendly", observer.friendly()); data.addProperty("self", false);
                combat.runtime().event("world_combat:actor_died", observer.actor(), next.target(), data.toString(), true);
            }
        }
    }
    public void clear() { pending.clear(); reported.clear(); }
}
