package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.ActorHandle;
import dev.worldcombat.core.runtime.Point;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.event.EventHooks;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.WeakHashMap;

/** Observed native flight and explicit, protection-aware interception adapters. No trajectory extrapolation. */
public final class NativeProjectileObservations {
    @FunctionalInterface public interface Interceptor {
        /** Complete this projectile's own removal/settlement lifecycle. Return true only after removal. */
        boolean intercept(Projectile projectile, LivingEntity interceptor);
    }
    private static final Map<EntityType<?>, Interceptor> ADAPTERS = new HashMap<>();
    private static final Set<EntityType<?>> VANILLA = Set.of(EntityType.ARROW, EntityType.SPECTRAL_ARROW,
        EntityType.SNOWBALL, EntityType.EGG, EntityType.LLAMA_SPIT, EntityType.SMALL_FIREBALL,
        EntityType.FIREBALL, EntityType.DRAGON_FIREBALL, EntityType.WITHER_SKULL, EntityType.SHULKER_BULLET);
    /** Mods opt a type into their own removal contract; no superclass-based permission is inferred. */
    public static void register(EntityType<?> type, Interceptor adapter) {
        if (type == null || adapter == null || ADAPTERS.putIfAbsent(type, adapter) != null)
            throw new IllegalArgumentException("Duplicate or invalid projectile interception adapter");
    }
    private record Leg(long tick, String ownerEntity, Vec3 from, Vec3 to) {}
    private static final class Track {
        Vec3 cursor;
        final ArrayList<Leg> path = new ArrayList<>();
        Track(Vec3 point) { cursor = point; }
    }
    private final MinecraftCombat combat;
    // Values contain only snapshots: they never retain the weak entity key or its level.
    private final Map<Projectile, Track> tracks = new WeakHashMap<>();
    NativeProjectileObservations(MinecraftCombat combat) { this.combat = combat; }
    public void joined(Entity entity) {
        if (entity instanceof Projectile projectile && projectile.level() instanceof ServerLevel)
            tracks.putIfAbsent(projectile, new Track(projectile.position()));
    }
    public void left(Entity entity) { if (entity instanceof Projectile projectile) tracks.remove(projectile); }
    public void before(Entity entity) {
        if (!(entity instanceof Projectile projectile) || !(projectile.level() instanceof ServerLevel) || projectile.isRemoved()) return;
        var track = tracks.computeIfAbsent(projectile, ignored -> new Track(projectile.position()));
        // A between-tick relocation is a discontinuity, not an invented flight segment.
        track.cursor = projectile.position();
    }
    public void after(Entity entity) {
        if (!(entity instanceof Projectile projectile)) return;
        if (projectile.isRemoved()) { tracks.remove(projectile); return; }
        var track = tracks.get(projectile);
        if (track != null) append(projectile, track, projectile.position());
    }
    /** Called at the native processed-hit boundary, after NeoForge has accepted the impact. */
    public void impact(Projectile projectile, HitResult hit) {
        if (!(projectile.level() instanceof ServerLevel) || hit.getType() == HitResult.Type.MISS) return;
        var track = tracks.computeIfAbsent(projectile, ignored -> new Track(projectile.position()));
        append(projectile, track, hit.getLocation());
    }
    private void append(Projectile projectile, Track track, Vec3 to) {
        if (!finite(track.cursor) || !finite(to)) return;
        if (!track.cursor.equals(to)) track.path.add(new Leg(combat.runtime().now(), owner(projectile), track.cursor, to));
        track.cursor = to;
    }
    private static boolean finite(Vec3 point) { return Double.isFinite(point.x) && Double.isFinite(point.y) && Double.isFinite(point.z); }
    private static String owner(Projectile projectile) { return projectile.getOwner() == null ? "" : projectile.getOwner().getStringUUID(); }
    private static JsonArray coordinates(Vec3 point) {
        var value = new JsonArray(); value.add(point.x); value.add(point.y); value.add(point.z); return value;
    }
    public JsonArray path(Projectile projectile) {
        var result = new JsonArray();
        if (projectile.isRemoved()) { tracks.remove(projectile); return result; }
        var track = tracks.get(projectile);
        if (track == null) return result;
        for (var leg : track.path) {
            var value = new JsonObject(); value.addProperty("tick", leg.tick()); value.addProperty("ownerEntity", leg.ownerEntity());
            value.add("from", coordinates(leg.from())); value.add("to", coordinates(leg.to())); result.add(value);
        }
        return result;
    }
    private static boolean supported(Projectile projectile) {
        return projectile instanceof CombatProjectile || VANILLA.contains(projectile.getType()) || ADAPTERS.containsKey(projectile.getType());
    }
    private boolean hostile(LivingEntity source, Projectile projectile) {
        if (!(projectile.getOwner() instanceof LivingEntity owner) || source == owner) return false;
        return !combat.friendly(combat.bind(source), combat.bind(owner))
            && !CombatServices.domain(source).friendly(source, owner) && !CombatServices.domain(owner).friendly(owner, source);
    }
    public String query(ActorHandle sourceHandle, Point point, double radius) {
        var source = combat.resolve(sourceHandle); var result = new JsonArray();
        if (source == null || !(source.level() instanceof ServerLevel level)) return result.toString();
        var at = MinecraftCombat.vec(point);
        for (var projectile : level.getEntitiesOfClass(Projectile.class, new AABB(at, at).inflate(radius), entity -> !entity.isRemoved())) {
            if (!finite(projectile.position()) || !finite(projectile.getDeltaMovement())) continue;
            var value = new JsonObject(); value.addProperty("id", projectile.getStringUUID());
            value.addProperty("type", BuiltInRegistries.ENTITY_TYPE.getKey(projectile.getType()).toString());
            value.addProperty("ownerEntity", owner(projectile));
            value.addProperty("owner", projectile.getOwner() instanceof LivingEntity living && living.isAlive() ? combat.bind(living).ref() : "");
            value.add("position", coordinates(projectile.position())); value.add("velocity", coordinates(projectile.getDeltaMovement()));
            var bounds = projectile.getBoundingBox();
            value.add("boundsMin", coordinates(new Vec3(bounds.minX, bounds.minY, bounds.minZ)));
            value.add("boundsMax", coordinates(new Vec3(bounds.maxX, bounds.maxY, bounds.maxZ)));
            value.addProperty("hostile", hostile(source, projectile)); value.addProperty("interceptable", supported(projectile));
            value.add("path", path(projectile)); result.add(value);
        }
        return result.toString();
    }
    public boolean intercept(ActorHandle sourceHandle, UUID controllerId, UUID id, boolean includeNonHostile) {
        var source = combat.resolve(sourceHandle);
        if (source == null || !combat.mayAct(sourceHandle, controllerId) || !(source.level() instanceof ServerLevel level)) return false;
        if (!(level.getEntity(id) instanceof Projectile projectile) || projectile.isRemoved() || !supported(projectile)
            || !finite(projectile.position()) || source.distanceToSqr(projectile) > 64 * 64 || !includeNonHostile && !hostile(source, projectile)
            || projectile.isInvulnerableTo(level.damageSources().mobAttack(source))) return false;
        var player = controllerId == null ? null : combat.server().getPlayerList().getPlayer(controllerId);
        if (projectile.getOwner() instanceof ServerPlayer owner && player != null && !player.canHarmPlayer(owner)) return false;
        var proxy = player != null ? player : FakePlayerFactory.get(level, new GameProfile(source.getUUID(), "WorldCombat"));
        if (proxy != player) proxy.moveTo(source.getX(), source.getY(), source.getZ(), source.getYRot(), source.getXRot());
        if (!CommonHooks.onPlayerAttackTarget(proxy, projectile)) return false;
        // Interception presents a real contact request to protections, but never synthesizes a hurt callback.
        if (EventHooks.onProjectileImpact(projectile, new EntityHitResult(source, projectile.position()))) return false;
        if (projectile.isRemoved()) return true;
        var adapter = ADAPTERS.get(projectile.getType());
        if (adapter != null) return adapter.intercept(projectile, source) && projectile.isRemoved();
        // CombatProjectile.remove owns its managed complete callback and scope bookkeeping.
        projectile.discard();
        return projectile.isRemoved();
    }
}
