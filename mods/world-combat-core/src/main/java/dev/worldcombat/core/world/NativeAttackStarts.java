package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.ActorHandle;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.AbstractArrow;
import net.minecraft.world.entity.projectile.AbstractHurtingProjectile;
import net.minecraft.world.entity.projectile.Projectile;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.WeakHashMap;

/** Fresh, observed native attempts. Descriptions contain a registered base budget, never a predicted successful hit. */
public final class NativeAttackStarts {
    @FunctionalInterface public interface LaunchDescription { JsonObject describe(Projectile projectile); }
    private static final Map<EntityType<?>, LaunchDescription> LAUNCHES = new HashMap<>();
    static {
        register(EntityType.ARROW, NativeAttackStarts::arrow);
        register(EntityType.SPECTRAL_ARROW, NativeAttackStarts::arrow);
        register(EntityType.TRIDENT, projectile -> shot(projectile, "minecraft:trident", "physical", 8, .05));
        register(EntityType.SMALL_FIREBALL, projectile -> fireball(projectile, 5));
        register(EntityType.FIREBALL, projectile -> fireball(projectile, 6));
    }
    /** Exact entity types opt into their own base-budget/flight description. Subclasses receive no inferred adapter. */
    public static void register(EntityType<?> type, LaunchDescription description) {
        if (type == null || description == null || LAUNCHES.putIfAbsent(type, description) != null)
            throw new IllegalArgumentException("Duplicate or invalid native launch description");
    }
    private record Entry(long sequence, long tick, JsonObject data) {}
    private final MinecraftCombat combat;
    private final Map<LivingEntity, ArrayList<Entry>> recent = new WeakHashMap<>();
    private long sequence, epoch = -1;
    NativeAttackStarts(MinecraftCombat combat) { this.combat = combat; }
    private void current() {
        if (epoch != CombatServices.CONTENT.epoch()) { recent.clear(); epoch = CombatServices.CONTENT.epoch(); }
    }
    private void record(LivingEntity actor, Entity target, String attempt, JsonObject description) {
        current();
        if (!actor.isAlive() || !CombatServices.domain(actor).available(actor)) return;
        long now = combat.runtime().now();
        var values = recent.computeIfAbsent(actor, ignored -> new ArrayList<>());
        values.removeIf(entry -> now - entry.tick() > 2);
        if (values.stream().anyMatch(entry -> entry.data().get("id").getAsString().equals(attempt))) return;
        var data = description.deepCopy();
        data.addProperty("id", attempt); data.addProperty("sequence", ++sequence); data.addProperty("tick", now);
        data.addProperty("actor", combat.bind(actor).ref());
        data.addProperty("target", target instanceof LivingEntity living && living.isAlive() ? combat.bind(living).ref() : "");
        values.add(new Entry(sequence, now, data));
    }
    /** Called only at a verified native attempt boundary. Player calls share the prepared-attempt identity. */
    public static void melee(LivingEntity attacker, Entity target, String attemptId) {
        if (!(attacker.level() instanceof ServerLevel level) || !(target instanceof LivingEntity victim) || !victim.isAlive()) return;
        var attribute = attacker.getAttribute(Attributes.ATTACK_DAMAGE);
        if (attribute == null || !(attribute.getValue() > 0) || !Double.isFinite(attribute.getValue())) return;
        var starts = CombatServices.get(level.getServer()).attackStarts();
        var data = new JsonObject(); data.addProperty("kind", "contact");
        data.addProperty("profile", attacker instanceof Player ? "minecraft:player_melee" : "minecraft:mob_melee");
        data.addProperty("damageType", attacker instanceof Player ? "minecraft:player_attack" : "minecraft:mob_attack");
        data.addProperty("category", "physical"); data.addProperty("baseDamage", attribute.getValue());
        data.addProperty("budgetBasis", "attack-attribute");
        starts.record(attacker, victim, attemptId == null || attemptId.isEmpty() ? "melee:" + (starts.sequence + 1) : attemptId, data);
    }
    /** ServerLevel.addFreshEntity returned true. Loading saved entities and failed joins never enter this path. */
    public static void launched(Entity entity) {
        if (!(entity instanceof Projectile projectile) || !(entity.level() instanceof ServerLevel level)
            || !(projectile.getOwner() instanceof LivingEntity owner) || !owner.isAlive()) return;
        var adapter = LAUNCHES.get(projectile.getType()); if (adapter == null) return;
        var description = adapter.describe(projectile); if (description == null) return;
        CombatServices.get(level.getServer()).attackStarts().record(owner, null, "launch:" + projectile.getStringUUID(), description);
    }
    private static JsonObject arrow(Projectile projectile) {
        if (!(projectile instanceof AbstractArrow arrow)) return null;
        double budget = Math.ceil(projectile.getDeltaMovement().length() * arrow.getBaseDamage());
        return shot(projectile, "minecraft:arrow", "physical", budget, .05);
    }
    private static JsonObject fireball(Projectile projectile, double baseDamage) {
        if (!(projectile instanceof AbstractHurtingProjectile fireball)) return null;
        var data = shot(projectile, "minecraft:fireball", "special", baseDamage, 0);
        if (data != null) {
            data.addProperty("acceleration", fireball.accelerationPower);
            data.addProperty("drag", (double) .95f); data.addProperty("waterDrag", (double) .8f);
        }
        return data;
    }
    private static JsonObject shot(Projectile projectile, String damageType, String category, double budget, double gravity) {
        double speed = projectile.getDeltaMovement().length();
        if (!(budget > 0) || !(speed > 0) || !Double.isFinite(budget) || !Double.isFinite(speed)) return null;
        var data = new JsonObject(); data.addProperty("kind", "projectile");
        data.addProperty("profile", BuiltInRegistries.ENTITY_TYPE.getKey(projectile.getType()).toString());
        data.addProperty("projectile", projectile.getStringUUID()); data.addProperty("damageType", damageType);
        data.addProperty("category", category); data.addProperty("baseDamage", budget); data.addProperty("budgetBasis", "registered-launch-base");
        data.addProperty("speed", speed); data.addProperty("gravity", projectile.isNoGravity() ? 0 : gravity);
        data.addProperty("radius", projectile.getBbWidth() * .5);
        if (projectile instanceof AbstractArrow) {
            data.addProperty("drag", (double) .99f);
            data.addProperty("waterDrag", projectile.getType() == EntityType.TRIDENT ? (double) .99f : (double) .6f);
        }
        return data;
    }
    /** A cursor and up to two ticks of fresh facts for this visible actor. Querying does not manufacture a start. */
    public String query(ActorHandle observer, ActorHandle actor, long after) {
        current(); var result = new JsonObject(); var records = new JsonArray();
        result.addProperty("cursor", sequence); result.add("records", records);
        var view = combat.observe(observer, actor);
        if (view == null || !view.visible()) return result.toString();
        var body = combat.resolve(actor); var values = body == null ? null : recent.get(body);
        if (values == null) return result.toString();
        long now = combat.runtime().now(); values.removeIf(entry -> now - entry.tick() > 2);
        for (var entry : values) if (entry.sequence() > after) records.add(entry.data().deepCopy());
        return result.toString();
    }
}
