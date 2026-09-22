package dev.worldcombat.core.world;

import dev.worldcombat.core.WorldCombatCore;
import dev.worldcombat.core.runtime.*;
import dev.latvian.mods.kubejs.script.ConsoleJS;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.*;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.*;
import java.util.*;

public final class MinecraftCombat implements CombatHost {
    private record Binding(LivingEntity entity, CombatDomain domain, ActorHandle handle, String controlIdentity) {}
    private final MinecraftServer server;
    private final Map<UUID, Binding> bindings = new HashMap<>();
    private final ArrayDeque<ActorHandle> departures = new ArrayDeque<>();
    private final ActionRuntime runtime;
    private final EffectSavedData effectStorage;
    private long generation;
    private final WorldEffects effects;
    private final WorldHelpers helpers = new WorldHelpers(this);
    private final WorldAttributes attributes = new WorldAttributes(this);
    public WorldAttributes attributes() { return attributes; }
    public WorldHelpers helpers() { return helpers; }
    private final WorldBodies bodies = new WorldBodies(this);
    public WorldBodies bodies() { return bodies; }
    private final WorldPresentations presentations = new WorldPresentations(this);
    public WorldPresentations presentations() { return presentations; }
    @Override public void present(long owner, ActorHandle actor, String key, String type, int version, Point point, String data) {
        presentations.put(owner, actor, key, type, version, point, data);
    }
    @Override public void presentFor(long owner, ActorHandle actor, String key, String type, int version, Point point, String data, int ticks) {
        presentations.putFor(owner, actor, key, type, version, point, data, ticks);
    }
    private String healthCause = "";
    @Override public BlockObservation block(ActorHandle actor, Point point) { return NativeBlockUse.observe(this, actor, point); }
    @Override public RegistryObservation registry(ActorHandle actor, String registry, String id) {
        var entity = resolve(actor); return entity == null ? null : NativeRegistryFacts.entry(entity.registryAccess(), registry, id);
    }
    @Override public ItemObservation item(ActorHandle actor, String id) {
        var entity = resolve(actor); return entity == null ? null : NativeRegistryFacts.item(entity.registryAccess(), id);
    }
    @Override public FluidObservation fluid(ActorHandle actor, Point point) { return NativeRegistryFacts.fluid(this, actor, point); }
    @Override public RegistryObservation entityType(ActorHandle actor) {
        var entity = resolve(actor); if (entity == null) return null;
        return new RegistryObservation("minecraft:entity_type", net.minecraft.core.registries.BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType()).toString(),
            entity.getType().builtInRegistryHolder().tags().map(tag -> tag.location().toString()).toList());
    }
    @Override public String useItem(ActorHandle actor, UUID controller, Point point, String item, String expected) {
        return NativeBlockUse.use(this, actor, controller, point, item, expected);
    }
    @Override public String interactBlock(ActorHandle actor, UUID controller, Point point, String face, boolean secondary, String expected) {
        return NativeBlockUse.interact(this, actor, controller, point, face, secondary, expected);
    }
    @Override public EnergyObservation energy(ActorHandle actor, Point point, String side) { return NativeEnergy.read(this, actor, point, side); }
    @Override public int receiveEnergy(ActorHandle actor, UUID controller, Point point, String side, int amount, boolean simulate) {
        return NativeEnergy.receive(this, actor, controller, point, side, amount, simulate);
    }
    private String damageMetadata = "{}";
    private final Map<Long, List<Runnable>> resourceLeases = new HashMap<>();
    private final WorldMobEffects mobEffectLeases = new WorldMobEffects(this);
    WorldMobEffects mobEffectLeases() { return mobEffectLeases; }
    int resourceLeaseCount(long owner) { var values = resourceLeases.get(owner); return values == null ? 0 : values.size(); }
    // Retain the native impact source through deferred script settlement, including after entity removal.
    private final Map<String, CombatProjectile> projectiles = new HashMap<>();
    @Override public String projectile(long lease, ActorHandle source, UUID controller, Point origin, Point velocity, double gravity, double radius,
                                       double range, int lifetime, java.util.function.Consumer<Impact> hit, Runnable complete, String appearance) {
        checkThread();
        if (lease == 0 || !mayAct(source, controller)) throw new ActionInactiveException("Projectile source left");
        var owner = Objects.requireNonNull(resolve(source), "Actor left");
        var entity = new CombatProjectile(CombatWorldContent.PROJECTILE.get(), owner.level());
        entity.configure(this, lease, owner, vec(origin), vec(velocity), gravity, radius, range, lifetime, hit, complete, appearance);
        String id = entity.getStringUUID();
        projectiles.put(id, entity);
        try {
            if (!((ServerLevel) owner.level()).addFreshEntity(entity)) throw new IllegalStateException("Native projectile spawn rejected");
        } catch (RuntimeException failure) { projectiles.remove(id); entity.discard(); throw failure; }
        return id;
    }
    @Override public void removeProjectile(long owner, String id) {
        checkThread(); var projectile = projectiles.get(id);
        if (projectile != null && projectile.action() == owner) { projectiles.remove(id); projectile.discard(); }
    }
    @Override public void stopProjectile(long owner, String id) {
        checkThread(); var projectile = projectiles.get(id);
        if (projectile != null && projectile.action() == owner) projectile.discard();
    }
    @Override public boolean projectileDamage(long lease, ActorHandle source, UUID controller, Impact impact, double amount, String metadata) {
        checkThread();
        var projectile = projectiles.get(impact.projectile());
        var owner = resolve(impact.source());
        if (projectile == null || projectile.action() != lease || !mayAct(source, controller) || owner == null || owner.level() != projectile.level()) return false;
        projectile.damageOrigin(vec(impact.origin()));
        if (impact.target() == null) {
            var entity = ((ServerLevel) projectile.level()).getEntity(UUID.fromString(impact.entity()));
            return entity != null && entity.hurt(actionDamageSource(owner, projectile,
                com.google.gson.JsonParser.parseString(metadata).getAsJsonObject()), NativeAmounts.positive(amount));
        }
        var target = resolve(impact.target());
        if (target == null || !mayHit(owner, target, null)) return false;
        String previous = damageMetadata; damageMetadata = metadata;
        try { return settleDamage(owner, target, owner instanceof ServerPlayer player ? player : null, amount, projectile); }
        finally { damageMetadata = previous; }
    }
    private LivingEntity damageRecipient;
    private net.minecraft.world.damagesource.DamageSource damageContext;
    private boolean damageKnockback = true;
    private record Audible(String dimension, double radius, SoundObservation observation) {}
    private final ArrayDeque<Audible> sounds = new ArrayDeque<>();
    private long soundId;
    private String soundMetadata = "{}";
    public void observeSound(net.neoforged.neoforge.event.PlayLevelSoundEvent event, Vec3 location) {
        checkThread();
        if (event.isCanceled() || event.getSound() == null || event.getNewVolume() <= 0) return;
        var sound = event.getSound().value();
        sounds.addLast(new Audible(event.getLevel().dimension().location().toString(), sound.getRange(event.getNewVolume()),
            new SoundObservation(++soundId, sound.getLocation().toString(), point(location), runtime.now(), soundMetadata)));
    }
    private record DamageTicket(ActorHandle source, ActorHandle target, double before, String data) {}
    private final Map<net.minecraft.world.damagesource.DamageSource, Map<UUID, DamageTicket>> damageTickets = new IdentityHashMap<>();
    private final Set<ActorHandle> controlled = new HashSet<>();
    private final Map<ActorHandle, Set<Long>> controlOwners = new HashMap<>();
    public WorldEffects effects() { return effects; }

    MinecraftCombat(MinecraftServer server) {
        this.server = server;
        effects = new WorldEffects(this);
        runtime = new ActionRuntime(this, CombatServices.CONTENT);
        effectStorage = server.overworld().getDataStorage().computeIfAbsent(EffectSavedData.FACTORY, "worldcombat_effects");
        effectStorage.attach(runtime.effects());
    }

    public ActionRuntime runtime() { return runtime; }
    public MinecraftServer server() { return server; }
    @Override public void effectChanged(ActorHandle actor) {
        var entity = inspect(actor);
        if (entity != null) net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(new CombatEffectChangedEvent(entity));
    }
    @Override public void effectChanged(ActorHandle actor, String definition) {
        effectChanged(actor);
        var topic = "world_combat:effect_changed/" + definition.replace(':', '/');
        if (runtime != null && CombatServices.CONTENT.ready() && CombatServices.CONTENT.hooks().has(topic) && valid(actor))
            runtime.event(topic, actor, null, "{}", true);
    }
    public LivingEntity inspect(ActorHandle handle) {
        if (handle == null) return null;
        var binding = bindings.get(handle.entity());
        return binding != null && binding.handle().equals(handle) && binding.controlIdentity().equals(binding.domain().controlIdentity(binding.entity()))
            && handle.identity().equals(binding.domain().identity(binding.entity())) ? binding.entity() : null;
    }
    public ActorHandle bind(LivingEntity entity) {
        checkThread();
        var old = bindings.get(entity.getUUID());
        if (old != null && old.entity() == entity && old.controlIdentity().equals(old.domain().controlIdentity(entity)) && old.handle().identity().equals(old.domain().identity(entity))) return old.handle();
        if (old != null) {
            runtime.cancelActor(old.handle(), "entity-replaced");
            controlled.remove(old.handle()); controlOwners.remove(old.handle());
        }
        var domain = CombatServices.domain(entity);
        var handle = new ActorHandle(domain.id(), domain.identity(entity), entity.getUUID(), ++generation);
        bindings.put(entity.getUUID(), new Binding(entity, domain, handle, domain.controlIdentity(entity)));
        if (domain.available(entity)) runtime.event("world_combat:actor_bound", handle, null, "{}", true);
        return handle;
    }
    @Override public ActorHandle actorNear(ActorHandle source, UUID id) {
        var entity = resolve(source);
        if (entity == null || !(entity.level() instanceof ServerLevel level)) return null;
        if (level.getEntity(id) instanceof LivingEntity other && entity.distanceToSqr(other) <= 64 * 64
            && CombatServices.domain(other).available(other)) return bind(other);
        return null;
    }

    public LivingEntity resolve(ActorHandle handle) {
        if (handle == null) return null;
        var binding = bindings.get(handle.entity());
        if (binding == null || !binding.handle().equals(handle) || !binding.domain().available(binding.entity())
            || !binding.controlIdentity().equals(binding.domain().controlIdentity(binding.entity()))
            || !handle.identity().equals(binding.domain().identity(binding.entity())))
            return null;
        var entity = binding.entity();
        if (!(entity.level() instanceof ServerLevel level) || level.getEntity(entity.getUUID()) != entity) return null;
        return entity;
    }

    public void left(LivingEntity entity) {
        checkThread();
        var binding = bindings.get(entity.getUUID());
        if (binding == null || binding.entity() != entity) return;
        // Tracking callbacks run inside chunk transitions. Retire access before cancellation:
        // native navigation may reload terrain. Release scopes at the host tick boundary.
        bindings.remove(entity.getUUID(), binding);
        controlled.remove(binding.handle());
        controlOwners.remove(binding.handle());
        departures.addLast(binding.handle());
    }
    private void flushDepartures() {
        // Handles include their generation: rejoining before this flush keeps the new binding intact.
        for (ActorHandle actor; (actor = departures.pollFirst()) != null; )
            runtime.cancelActor(actor, "entity-left");
    }

    public void tick() {
        flushDepartures();
        damageTickets.clear();
        for (Runnable ended; (ended = endedEffects.pollFirst()) != null; ) ended.run();
        flushChangedActors();
        runtime.tick();
        effectStorage.setDirty();
        effects.tick();
        helpers.tick();
        NativeWorldWrites.tickSpawned(this);
        sounds.removeIf(sound -> runtime.now() - sound.observation().tick() > 200);
        if (CombatServices.CONTENT.hooks().has("world_combat:actor_tick")) {
            for (var level : server.getAllLevels()) for (var entity : level.getAllEntities())
                if (entity instanceof LivingEntity living && CombatServices.domain(living).available(living))
                    runtime.event("world_combat:actor_tick", bind(living), null, "{}", true);
        }
        for (var binding : List.copyOf(bindings.values()))
            if (resolve(binding.handle()) == null) left(binding.entity());
        flushDepartures();
        presentations.tick();
    }

    public void stop() { flushDepartures(); endedEffects.clear(); changedActors.clear(); NativeWorldWrites.stopSpawned(this); runtime.stop(); effectStorage.setDirty(); effects.stop(); helpers.stop(); presentations.clear(); controlled.clear(); controlOwners.clear(); bindings.clear(); departures.clear(); }
    public void controlled(ActorHandle actor, boolean value) {
        controlled(0, actor, value);
    }
    @Override public void controlled(long owner, ActorHandle actor, boolean value) {
        checkThread();
        var owners = controlOwners.computeIfAbsent(actor, key -> new HashSet<>());
        if (value) owners.add(owner); else owners.remove(owner);
        boolean enabled = !owners.isEmpty();
        if (!enabled) controlOwners.remove(actor);
        if (enabled ? controlled.add(actor) : controlled.remove(actor)) {
            var entity = resolve(actor);
            if (entity != null) CombatServices.domain(entity).movementControl(entity, enabled);
            stopMovement(actor);
        }
    }
    public boolean controls(LivingEntity entity) {
        if (entity.isPassenger() || entity.isVehicle()) return false;
        var binding = bindings.get(entity.getUUID());
        return binding != null && (controlled.contains(binding.handle()) || runtime.claimed(binding.handle(), "movement") || runtime.claimed(binding.handle(), "aim"));
    }
    @Override public void begin(long instance, ActorHandle actor) {
        boolean managed = controlled.contains(actor);
        controlled(instance, actor, true);
        // Every steering acquisition retires old brain work, including a handoff from an ambient lease.
        if (managed) {
            var entity = resolve(actor);
            if (entity != null) CombatServices.domain(entity).movementControl(entity, true);
        }
        stopMovement(actor);
    }
    @Override public void committed(ActionContext action) {
        var entity = resolve(action.actor());
        if (entity != null) CombatServices.domain(entity).committed(entity, action);
    }
    @Override public void release(long instance, String reason) {
        // Also covers native adapters using the low-level host projectile entry directly.
        for (var projectile : List.copyOf(projectiles.values())) if (projectile.action() == instance) removeProjectile(instance, projectile.getStringUUID());
        var leased = resourceLeases.remove(instance);
        if (leased != null) for (var cleanup : leased) {
            try { cleanup.run(); }
            catch (RuntimeException error) { WorldCombatCore.LOGGER.error("WorldCombat resource cleanup failed for owner {}", instance, error); }
        }
        presentations.release(instance, reason);
        effects.release(instance, reason);
        helpers.release(instance);
        attributes.release(instance);
        for (var actor : List.copyOf(controlOwners.keySet())) controlled(instance, actor, false);
    }
    @Override public void lease(long instance, Runnable cleanup) {
        checkThread();
        if (instance == 0 || cleanup == null) throw new IllegalArgumentException("Invalid resource lease");
        var values = resourceLeases.computeIfAbsent(instance, key -> new ArrayList<>());
        values.add(cleanup);
    }
    @Override public long terrain(long owner, ActorHandle actor, UUID controller, String cells, int ticks) { return effects.place(owner, actor, controller, cells, ticks); }
    @Override public String terrainResult(long owner, ActorHandle actor, UUID controller, String cells, int ticks) { return effects.placeResult(owner, actor, controller, cells, ticks); }
    @Override public boolean attribute(long owner, ActorHandle target, String id, double amount, String operation) { return attributes.set(owner, target, id, amount, operation); }
    @Override public void removeTerrain(ActorHandle actor, long id) { effects.remove(actor, id); }
    @Override public ActorHandle helper(long owner, ActorHandle actor, Point point, double health, String data, int ticks) { return helpers.create(owner, actor, point, health, data, ticks); }
    @Override public void removeHelper(ActorHandle actor, ActorHandle helper) { helpers.remove(actor, helper); }
    @Override public ActorHandle helperSource(ActorHandle actor) { return helpers.source(actor); }
    @Override public String helperData(ActorHandle actor) { return helpers.data(actor); }
    @Override public void stopMovement(ActorHandle actor) {
        if (resolve(actor) instanceof Mob mob && !mob.isPassenger() && !mob.isVehicle()) { mob.getNavigation().stop(); mob.setTarget(null); }
    }
    @Override public void face(ActorHandle actor, Point target, double yawSpeed, double pitchSpeed) {
        checkThread();
        if (!(resolve(actor) instanceof Mob mob) || mob.isPassenger() || mob.isVehicle()) return;
        double dx = target.x() - mob.getX(), dy = target.y() - mob.getEyeY(), dz = target.z() - mob.getZ();
        if (dx * dx + dy * dy + dz * dz < 1.0e-8) return;
        float yaw = (float) (Math.atan2(dz, dx) * 180 / Math.PI) - 90;
        float pitch = (float) (-Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180 / Math.PI);
        mob.setYRot(net.minecraft.util.Mth.approachDegrees(mob.getYRot(), yaw, (float) yawSpeed));
        mob.setXRot(net.minecraft.util.Mth.approachDegrees(mob.getXRot(), pitch, (float) pitchSpeed));
        mob.setYHeadRot(mob.getYRot()); mob.setYBodyRot(mob.getYRot());
        mob.getLookControl().setLookAt(target.x(), target.y(), target.z(), (float) yawSpeed, (float) pitchSpeed);
    }
    @Override public String environment(ActorHandle actor, Point point) {
        checkThread();
        var entity = resolve(actor);
        if (entity == null) throw new IllegalStateException("Entity left");
        var level = entity.level(); var pos = net.minecraft.core.BlockPos.containing(point.x(), point.y(), point.z());
        var data = new com.google.gson.JsonObject();
        boolean loaded = level.hasChunkAt(pos) && level.isInWorldBounds(pos);
        data.addProperty("loaded", loaded);
        data.addProperty("dimension", level.dimension().location().toString());
        data.addProperty("dayTime", level.getDayTime()); data.addProperty("day", level.isDay());
        data.addProperty("rain", level.getRainLevel(1)); data.addProperty("thunder", level.getThunderLevel(1));
        if (loaded) {
            data.addProperty("skyVisible", level.canSeeSky(pos));
            data.addProperty("skyLight", level.getBrightness(net.minecraft.world.level.LightLayer.SKY, pos));
            data.addProperty("blockLight", level.getBrightness(net.minecraft.world.level.LightLayer.BLOCK, pos));
            data.addProperty("rainingAt", level.isRainingAt(pos));
            data.addProperty("block", net.minecraft.core.registries.BuiltInRegistries.BLOCK.getKey(level.getBlockState(pos).getBlock()).toString());
            data.addProperty("fluid", net.minecraft.core.registries.BuiltInRegistries.FLUID.getKey(level.getFluidState(pos).getType()).toString());
        }
        return data.toString();
    }
    @Override public String navigate(ActorHandle actor, Point goal, double within, double speed) {
        checkThread();
        if (!(resolve(actor) instanceof Mob mob)) return "cannot-move";
        if (mob.isPassenger() || mob.isVehicle()) return "mounted-control";
        String nativeRefusal = CombatServices.domain(mob).navigationReason(mob, goal);
        if (!nativeRefusal.isEmpty()) { stopMovement(actor); return nativeRefusal; }
        var request = new com.google.gson.JsonObject(); request.addProperty("speed", speed);
        var response = runtime.event("world_combat:navigate", actor, null, request.toString(), false);
        if (!response.rejection().isEmpty()) { stopMovement(actor); return response.rejection(); }
        speed = com.google.gson.JsonParser.parseString(response.data()).getAsJsonObject().get("speed").getAsDouble();
        if (!Double.isFinite(speed) || speed < 0 || speed > 3) throw new IllegalArgumentException("Invalid script navigation multiplier");
        if (speed == 0) { stopMovement(actor); return "movement-restricted"; }
        if (position(actor).minus(goal).length() > 64) return "out-of-range";
        double distance = position(actor).minus(goal).length();
        if (distance <= within) { stopMovement(actor); return "arrived"; }
        mob.getLookControl().setLookAt(goal.x(), goal.y(), goal.z());
        if (!mob.getNavigation().moveTo(goal.x(), goal.y(), goal.z(), speed)) {
            if (!mob.onGround() && !mob.isInLiquid() && !mob.isNoGravity()) return "not-grounded";
            return "path-blocked";
        }
        return "moving";
    }
    @Override public void checkThread() {
        if (!server.isSameThread()) throw new IllegalStateException("World combat runs on the server thread");
    }
    @Override public boolean valid(ActorHandle handle) { return handle != null && resolve(handle) != null; }
    @Override public String controlIdentity(ActorHandle handle) {
        var entity = resolve(handle);
        if (entity == null) throw new ActionInactiveException("Effect actor left");
        return CombatServices.domain(entity).controlIdentity(entity);
    }
    @Override public ActorHandle findActor(String domain, UUID identity) {
        checkThread();
        for (var binding : List.copyOf(bindings.values()))
            if (binding.handle().domain().equals(domain) && binding.handle().identity().equals(identity) && valid(binding.handle()))
                return binding.handle();
        for (var level : server.getAllLevels()) for (var candidate : level.getAllEntities()) {
            if (candidate instanceof LivingEntity entity) {
                var nativeDomain = CombatServices.domain(entity);
                if (nativeDomain.id().equals(domain) && nativeDomain.identity(entity).equals(identity) && nativeDomain.available(entity))
                    return bind(entity);
            }
        }
        return null;
    }
    @Override public boolean mayAct(ActorHandle actor, UUID controllerId) {
        var entity = resolve(actor);
        var controller = controllerId == null ? null : server.getPlayerList().getPlayer(controllerId);
        if (entity == null || controllerId != null && (controller == null || !controller.isAlive())) return false;
        return controller == null || controller.level() == entity.level()
            && controller.distanceToSqr(entity) <= 64 * 64
            && CombatServices.domain(entity).mayControl(entity, controller);
    }
    @Override public Point position(ActorHandle handle) {
        var entity = resolve(handle);
        if (entity == null) throw new IllegalStateException("Entity left");
        return point(entity.getBoundingBox().getCenter());
    }

    @Override public boolean sameWorld(ActorHandle actor, ActorHandle target) {
        var source = resolve(actor); var other = resolve(target);
        return source != null && other != null && source.level() == other.level();
    }
    @Override public boolean friendly(ActorHandle actor, ActorHandle target) {
        var a = helpers.source(actor); var b = helpers.source(target);
        if (a == null) a = bodies.principal(actor);
        if (b == null) b = bodies.principal(target);
        if (a != null || b != null) return friendly(a == null ? actor : a, b == null ? target : b);
        var source = resolve(actor); var other = resolve(target);
        return source != null && other != null && (source == other
            || CombatServices.domain(source).friendly(source, other) || CombatServices.domain(other).friendly(other, source));
    }

    public boolean mayHit(LivingEntity source, LivingEntity target, ServerPlayer controller) {
        var sourceOwner = source instanceof HelperActor ? helpers.source(bind(source)) : source instanceof ScriptedBody ? bodies.principal(bind(source)) : null;
        var targetOwner = target instanceof HelperActor ? helpers.source(bind(target)) : target instanceof ScriptedBody ? bodies.principal(bind(target)) : null;
        if ((sourceOwner != null || targetOwner != null) && friendly(bind(source), bind(target))) return false;
        return source != target && target.isAlive() && !target.isInvulnerable() && CombatServices.domain(target).available(target)
            && target.level() == source.level() && !(target instanceof ServerPlayer player && (player.isCreative() || player.isSpectator()))
            && (controller == null || !target.getUUID().equals(controller.getUUID()))
            && !CombatServices.domain(source).friendly(source, target)
            && !CombatServices.domain(target).friendly(target, source);
    }

    @Override public Impact trace(ActorHandle actor, UUID controllerId, Point from, Point to, double radius) {
        var source = Objects.requireNonNull(resolve(actor), "Actor left");
        var level = (ServerLevel) source.level();
        var start = vec(from); var end = vec(to);
        var block = level.clip(new ClipContext(start, end, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, source));
        var controller = controllerId == null ? null : server.getPlayerList().getPlayer(controllerId);
        var hit = net.minecraft.world.entity.projectile.ProjectileUtil.getEntityHitResult(level, source, start, block.getLocation(),
            new AABB(start, block.getLocation()).inflate(radius + 0.5),
            entity -> entity instanceof LivingEntity living && mayHit(source, living, controller), (float) radius);
        return new Impact(point(hit == null ? block.getLocation() : hit.getLocation()), hit == null ? null : bind((LivingEntity) hit.getEntity()),
            hit == null && block.getType() != HitResult.Type.MISS);
    }

    @Override public boolean damage(ActorHandle actor, ActorHandle target, UUID controllerId, double amount) {
        checkThread();
        var source = resolve(actor); var victim = resolve(target);
        var controller = controllerId == null ? null : server.getPlayerList().getPlayer(controllerId);
        if (source == null || victim == null || !mayAct(actor, controllerId) || !mayHit(source, victim, controller)) return false;
        return settleDamage(source, victim, controller, amount, null);
    }
    private boolean settleDamage(LivingEntity source, LivingEntity victim, ServerPlayer controller, double amount, CombatProjectile projectile) {
        float nativeAmount = NativeAmounts.positive(amount);
        var data = com.google.gson.JsonParser.parseString(damageMetadata).getAsJsonObject();
        var cause = actionDamageSource(source, projectile, data);
        boolean knockback = !data.has("knockback") || data.get("knockback").getAsBoolean();
        var previousRecipient = damageRecipient;
        var previousContext = damageContext;
        boolean previousKnockback = damageKnockback;
        damageRecipient = victim;
        damageContext = cause;
        damageKnockback = knockback;
        boolean applied;
        try { applied = victim.hurt(damageContext, nativeAmount); }
        finally { damageRecipient = previousRecipient; damageContext = previousContext; damageKnockback = previousKnockback; }
        if (applied && !victim.isAlive()) CombatServices.domain(source).defeated(source, victim, controller);
        return applied;
    }

    public boolean allowsKnockback(LivingEntity entity) {
        return entity != damageRecipient || damageKnockback;
    }
    @Override public boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount, String metadata) {
        String previous = damageMetadata; damageMetadata = metadata;
        try { return damage(actor, target, controller, amount); } finally { damageMetadata = previous; }
    }

    @Override public void particle(ActorHandle actor, Point position) {
        var source = resolve(actor);
        if (source != null) ((ServerLevel) source.level()).sendParticles(ParticleTypes.END_ROD,
            position.x(), position.y(), position.z(), 1, 0, 0, 0, 0);
    }

    @Override public com.google.gson.JsonObject facts(ActorHandle target) {
        checkThread(); var out = new com.google.gson.JsonObject();
        var entity = inspect(target);
        if (entity != null) {
            out.addProperty("entityType", net.minecraft.core.registries.BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType()).toString());
            var tags = new com.google.gson.JsonArray(); entity.getType().builtInRegistryHolder().tags()
                .map(tag -> tag.location().toString()).sorted().forEach(tags::add);
            out.add("entityTags", tags);
            CombatServices.domain(entity).facts(entity, out);
        }
        return out;
    }
    @Override public WorldObservation observe(ActorHandle source, ActorHandle target) {
        checkThread(); var origin = inspect(source); var entity = inspect(target);
        if (origin == null || entity == null || origin.level() != entity.level() || origin.distanceToSqr(entity) > 64 * 64) return null;
        var attacking = entity instanceof Mob mob && mob.getTarget() != null ? bind(mob.getTarget()) : null;
        var hurt = entity.getLastHurtByMob();
        return new WorldObservation(target, point(entity.getBoundingBox().getCenter()), entity.getHealth(), entity.getMaxHealth(),
            entity.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.MOVEMENT_SPEED),
            source.equals(target) || origin.hasLineOfSight(entity), friendly(source, target), entity instanceof net.minecraft.world.entity.monster.Monster,
            entity instanceof ServerPlayer, entity.isInWaterOrRain(), entity.onGround(), attacking,
            hurt == null ? null : bind(hurt), hurt == null ? Integer.MAX_VALUE : Math.max(0, entity.tickCount - entity.getLastHurtByMobTimestamp()), String.join(",", entity.getTags()),
            entity.getBbWidth(), entity.getBbHeight(), point(entity.getDeltaMovement()));
    }
    @Override public EquipmentObservation[] equipment(ActorHandle source, ActorHandle target) {
        checkThread(); var origin = inspect(source); var entity = inspect(target);
        if (origin == null || entity == null || origin.level() != entity.level() || origin.distanceToSqr(entity) > 64 * 64) return new EquipmentObservation[0];
        return WorldEquipment.read(entity);
    }
    @Override public boolean equipmentTake(ActorHandle target, String provider, String slot, int index, String expected, int count) { return NativeEquipment.takeOp(this, target, provider, slot, index, expected, count).ok(); }
    @Override public String equipmentDrop(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) { return NativeEquipment.dropOp(this, target, provider, slot, index, expected, data, count).drop(); }
    @Override public boolean equipmentGive(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) { return NativeEquipment.giveOp(this, target, provider, slot, index, expected, item, count).ok(); }
    @Override public boolean equipmentExchange(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                               ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) {
        return NativeEquipment.exchangeOp(this, first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, count).ok();
    }
    @Override public String equipmentTakeResult(ActorHandle target, String provider, String slot, int index, String expected, int count) {
        return NativeEquipment.takeOp(this, target, provider, slot, index, expected, count).json();
    }
    @Override public String equipmentDropResult(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) {
        return NativeEquipment.dropOp(this, target, provider, slot, index, expected, data, count).json();
    }
    @Override public String equipmentGiveResult(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) {
        return NativeEquipment.giveOp(this, target, provider, slot, index, expected, item, count).json();
    }
    @Override public String equipmentExchangeResult(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                                    ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) {
        return NativeEquipment.exchangeOp(this, first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, count).json();
    }
    /** Read-only native probe: the full bounding box of a `width` x `height` body fits with feet centre at the point. */
    @Override public boolean freeSpace(ActorHandle source, Point point, double width, double height) {
        checkThread();
        var entity = resolve(source); if (entity == null) return false;
        var level = (ServerLevel) entity.level();
        var box = new AABB(point.x() - width / 2, point.y(), point.z() - width / 2,
            point.x() + width / 2, point.y() + height, point.z() + width / 2);
        var minPos = net.minecraft.core.BlockPos.containing(box.minX, box.minY, box.minZ);
        var maxPos = net.minecraft.core.BlockPos.containing(box.maxX - 1.0E-4, box.maxY - 1.0E-4, box.maxZ - 1.0E-4);
        if (!level.hasChunksAt(minPos, maxPos)) return false;
        if (level.isOutsideBuildHeight(minPos) || level.isOutsideBuildHeight(maxPos)) return false;
        if (!level.getWorldBorder().isWithinBounds(box)) return false;
        if (level.getBlockCollisions(entity, box).iterator().hasNext()) return false;
        return level.getEntities(entity, box, candidate -> candidate.isAlive() && candidate.canBeCollidedWith()).isEmpty();
    }
    @Override public AttributeObservation attributeValue(ActorHandle source, ActorHandle target, String id) {
        checkThread(); var origin = inspect(source); var entity = inspect(target);
        if (origin == null || entity == null || origin.level() != entity.level() || origin.distanceToSqr(entity) > 64 * 64) return null;
        var holder = net.minecraft.core.registries.BuiltInRegistries.ATTRIBUTE.getHolder(net.minecraft.resources.ResourceLocation.parse(id));
        if (holder.isEmpty()) return null;
        var attribute = entity.getAttribute(holder.get());
        return attribute == null ? null : new AttributeObservation(attribute.getBaseValue(), attribute.getValue());
    }
    @Override public ActorHandle[] query(ActorHandle source, Point centre, double radius, boolean visibleOnly) {
        var actor = resolve(source); if (actor == null) return new ActorHandle[0];
        var p = vec(centre);
        return actor.level().getEntitiesOfClass(LivingEntity.class, new AABB(p, p).inflate(radius), entity -> CombatServices.domain(entity).available(entity)
            && (!(entity instanceof ScriptedBody body) || body.targetable())
            && entity.getBoundingBox().getCenter().distanceToSqr(p) <= radius * radius && (!visibleOnly || actor.hasLineOfSight(entity)))
            .stream().sorted(Comparator.comparingDouble(entity -> entity.getBoundingBox().getCenter().distanceToSqr(p))).map(this::bind).toArray(ActorHandle[]::new);
    }
    @Override public boolean visible(ActorHandle source, ActorHandle target) {
        var actor = resolve(source); var entity = resolve(target); return actor != null && entity != null && actor.level() == entity.level() && actor.hasLineOfSight(entity);
    }
    @Override public double random(ActorHandle source) { var entity = resolve(source); if (entity == null) throw new ActionInactiveException("Actor left"); return entity.getRandom().nextDouble(); }
    @Override public ActorHandle spawnBody(ActorHandle summoner, UUID controller, Point point, String body, String definition, String data, int ticks) {
        return bodies.spawn(summoner, controller, point, body, definition, data, ticks);
    }
    @Override public String bodyInfo(ActorHandle actor) { return bodies.info(actor); }
    @Override public boolean configureBody(ActorHandle actor, String json) { return bodies.configure(actor, json); }
    @Override public boolean dismissBody(ActorHandle caller, ActorHandle actor) { return bodies.dismiss(caller, actor); }
    @Override public boolean motion(ActorHandle target, Point velocity, boolean add) {
        var entity = resolve(target); if (entity == null) return false;
        var vec = new Vec3(velocity.x(), velocity.y(), velocity.z());
        entity.setDeltaMovement(add ? entity.getDeltaMovement().add(vec) : vec);
        entity.hurtMarked = true; entity.hasImpulse = true;
        return true;
    }
    @Override public String placeBlock(ActorHandle actor, UUID controller, Point point, String state, String data) { return NativeWorldWrites.placeBlock(this, actor, controller, point, state, data); }
    @Override public String breakBlock(ActorHandle actor, UUID controller, Point point, boolean drops) { return NativeWorldWrites.breakBlock(this, actor, controller, point, drops); }
    @Override public String blockData(ActorHandle actor, Point point) { return NativeWorldWrites.blockData(this, actor, point); }
    @Override public String setBlockData(ActorHandle actor, UUID controller, Point point, String json) { return NativeWorldWrites.setBlockData(this, actor, controller, point, json); }
    @Override public String container(ActorHandle actor, Point point) { return NativeWorldWrites.container(this, actor, point); }
    @Override public int insertItem(ActorHandle actor, UUID controller, Point point, String item, int count) { return NativeWorldWrites.insertItem(this, actor, controller, point, item, count); }
    @Override public String extractItem(ActorHandle actor, UUID controller, Point point, int slot, int count) { return NativeWorldWrites.extractItem(this, actor, controller, point, slot, count); }
    @Override public String dropItem(ActorHandle actor, Point point, String item, int count, String data) { return NativeWorldWrites.dropItem(this, actor, point, item, count, data); }
    @Override public int giveItem(ActorHandle target, String item, int count) { return NativeWorldWrites.giveItem(this, target, item, count); }
    @Override public boolean explode(ActorHandle actor, Point point, double power, String data) { return NativeWorldWrites.explode(this, actor, point, power, data); }
    @Override public boolean lightning(ActorHandle actor, UUID controller, Point point, boolean visualOnly) { return NativeWorldWrites.lightning(this, actor, controller, point, visualOnly); }
    @Override public boolean ignite(ActorHandle target, int ticks) { return NativeWorldWrites.ignite(this, target, ticks); }
    @Override public boolean target(ActorHandle actor, ActorHandle target) { return NativeWorldWrites.target(this, actor, target); }
    @Override public boolean weather(ActorHandle actor, String weather, int ticks) { return NativeWorldWrites.weather(this, actor, weather, ticks); }
    @Override public Object nativeEntity(ActorHandle target) { return resolve(target); }
    @Override public Object nativeLevel(ActorHandle source) { var entity = resolve(source); return entity == null ? null : entity.level(); }
    @Override public Object nativeBlock(ActorHandle source, Point point, boolean blockEntity) {
        var entity = resolve(source); if (entity == null) return null;
        var pos = net.minecraft.core.BlockPos.containing(point.x(), point.y(), point.z());
        if (!entity.level().hasChunkAt(pos)) return null;
        return blockEntity ? entity.level().getBlockEntity(pos) : entity.level().getBlockState(pos);
    }
    @Override public Object[] nativeEntities(ActorHandle source, Point centre, double radius, String type) { return NativeWorldWrites.entities(this, source, centre, radius, type); }
    @Override public Object spawnEntity(ActorHandle actor, UUID controller, String type, Point point, String nbt, int ticks) { return NativeWorldWrites.spawnEntity(this, actor, controller, type, point, nbt, ticks); }
    @Override public int command(ActorHandle actor, UUID controller, String command) { return NativeWorldWrites.command(this, actor, controller, command); }
    /** Entities content spawned with a lifetime; discarded when it runs out or the server stops. */
    final java.util.Map<UUID, Long> spawnedLifetimes = new java.util.LinkedHashMap<>();
    @Override public boolean mount(ActorHandle rider, ActorHandle vehicle) {
        var passenger = resolve(rider); var mountEntity = vehicle == null ? null : resolve(vehicle);
        if (passenger == null) return false;
        if (mountEntity == null) { if (passenger.isPassenger()) { passenger.stopRiding(); return true; } return false; }
        if (passenger == mountEntity || mountEntity.isPassenger() || passenger.isVehicle() || passenger.level() != mountEntity.level()) return false;
        return passenger.startRiding(mountEntity, true);
    }
    @Override public double displace(ActorHandle source, ActorHandle target, Point delta, UUID controller) {
        var entity = resolve(target); if (entity == null) return 0;
        if (entity.isPassenger() || entity.isVehicle()) {
            if (source.equals(target)) throw new ActionRejectedException("mounted-control");
            return 0;
        }
        var before = entity.position(); var motion = vec(delta);
        var allowed = Entity.collideBoundingBox(entity, motion, entity.getBoundingBox(), entity.level(), entity.level().getEntityCollisions(entity, entity.getBoundingBox().expandTowards(motion)));
        stopMovement(target); entity.move(MoverType.SELF, allowed); entity.hurtMarked = true; return entity.position().distanceTo(before);
    }
    private boolean destination(LivingEntity entity, Point point, LivingEntity ignored) {
        if (entity == null || entity.isPassenger() || entity.isVehicle()) return false;
        var level = (ServerLevel) entity.level(); var feet = vec(point); var pos = net.minecraft.core.BlockPos.containing(feet);
        var box = entity.getBoundingBox().move(feet.subtract(entity.position()));
        return level.hasChunkAt(pos) && level.getWorldBorder().isWithinBounds(box) && !level.isOutsideBuildHeight(pos)
            && !level.getBlockCollisions(entity, box).iterator().hasNext()
            && level.getEntities(entity, box, candidate -> candidate != ignored && candidate.isAlive() && candidate.canBeCollidedWith()).isEmpty();
    }
    @Override public boolean teleport(ActorHandle source, ActorHandle target, Point point, UUID controller) {
        var entity = resolve(target); if (!destination(entity, point, null)) return false;
        stopMovement(target); entity.teleportTo(point.x(), point.y(), point.z()); entity.hurtMarked = true; return true;
    }
    @Override public boolean swap(ActorHandle source, ActorHandle first, ActorHandle second, UUID controller) {
        var a = resolve(first); var b = resolve(second); if (a == null || b == null || a.level() != b.level() || a == b) return false;
        var ap = point(a.position()); var bp = point(b.position());
        if (!destination(a, bp, b) || !destination(b, ap, a)) return false;
        stopMovement(first); stopMovement(second); a.teleportTo(bp.x(), bp.y(), bp.z()); b.teleportTo(ap.x(), ap.y(), ap.z()); a.hurtMarked = b.hurtMarked = true; return true;
    }
    @Override public double health(ActorHandle source, ActorHandle target, UUID controller, double delta, String cause) {
        checkThread();
        float nativeDelta = NativeAmounts.delta(delta);
        var actor = resolve(source); var entity = resolve(target); if (actor == null || entity == null) return 0;
        double before = entity.getHealth(); String previous = healthCause; healthCause = cause;
        try {
            if (delta > 0) { entity.heal(nativeDelta); CombatServices.domain(entity).healed(entity); }
            else {
                if (entity instanceof ServerPlayer player && (player.isCreative() || player.isSpectator())) return 0;
                if (actor != entity && !mayHit(actor, entity, controller == null ? null : server.getPlayerList().getPlayer(controller))) return 0;
                if (entity.hurt(damageSource(actor, "effect"), -nativeDelta) && !entity.isAlive() && actor != entity)
                    CombatServices.domain(actor).defeated(actor, entity, controller == null ? null : server.getPlayerList().getPlayer(controller));
            }
            return entity.getHealth() - before;
        } finally { healthCause = previous; }
    }
    private net.minecraft.world.damagesource.DamageSource damageSource(LivingEntity source, String kind) {
        return damageSource(source, kind, null);
    }
    private net.minecraft.world.damagesource.DamageSource actionDamageSource(LivingEntity source, CombatProjectile projectile, com.google.gson.JsonObject data) {
        boolean independent = data.has("bypassCooldown") && data.get("bypassCooldown").getAsBoolean();
        return data.has("damageType")
            ? damageSourceType(source, net.minecraft.resources.ResourceLocation.parse(data.get("damageType").getAsString()), projectile)
            : damageSource(source, (projectile == null ? "action" : "projectile") + (independent ? "_independent" : ""), projectile);
    }
    private net.minecraft.world.damagesource.DamageSource damageSource(LivingEntity source, String kind, Entity direct) {
        return damageSourceType(source, net.minecraft.resources.ResourceLocation.fromNamespaceAndPath("world_combat_core", kind), direct);
    }
    private net.minecraft.world.damagesource.DamageSource damageSourceType(LivingEntity source, net.minecraft.resources.ResourceLocation type, Entity direct) {
        var key = net.minecraft.resources.ResourceKey.create(net.minecraft.core.registries.Registries.DAMAGE_TYPE,
            type);
        return new net.minecraft.world.damagesource.DamageSource(source.registryAccess().registryOrThrow(net.minecraft.core.registries.Registries.DAMAGE_TYPE).getHolderOrThrow(key),
            direct == null ? source : direct, source, direct instanceof CombatProjectile projectile ? projectile.damageOrigin() : null);
    }
    @Override public boolean clear(ActorHandle source, Point from, Point to) {
        var actor = resolve(source); if (actor == null) return false;
        return actor.level().clip(new ClipContext(vec(from), vec(to), ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, actor)).getType() == HitResult.Type.MISS;
    }
    @Override public void sound(ActorHandle source, String sound, Point point, double radius, String data) {
        var actor = resolve(source); if (actor == null) return;
        var id = net.minecraft.resources.ResourceLocation.parse(sound);
        // Resource-pack sounds need no server registry entry: vanilla's sound packet accepts a direct holder.
        var soundEvent = net.minecraft.core.registries.BuiltInRegistries.SOUND_EVENT.getOptional(id)
            .orElseGet(() -> net.minecraft.sounds.SoundEvent.createVariableRangeEvent(id));
        String previous = soundMetadata; soundMetadata = data;
        try { ((ServerLevel) actor.level()).playSound(null, point.x(), point.y(), point.z(), soundEvent, net.minecraft.sounds.SoundSource.NEUTRAL, (float) (radius / 16), 1); }
        finally { soundMetadata = previous; }
    }
    @Override public SoundObservation[] heard(ActorHandle source, long after, double radius) {
        var actor = resolve(source); if (actor == null) return new SoundObservation[0];
        return sounds.stream().filter(sound -> sound.observation().id() > after && sound.dimension().equals(actor.level().dimension().location().toString())
            && sound.observation().position().minus(position(source)).length() <= Math.min(radius, sound.radius()))
            .map(Audible::observation).toArray(SoundObservation[]::new);
    }
    /** A MobEffect registry id; the message names the fix because content authors usually pass a status tag here by mistake. */
    private static net.minecraft.core.Holder<net.minecraft.world.effect.MobEffect> mobEffectHolder(String id) {
        return net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getHolder(net.minecraft.resources.ResourceLocation.parse(id))
            .orElseThrow(() -> new IllegalArgumentException("Unknown mob effect id: " + id + " (use the id given to e.create(...) in startup; a status tag is read with MobEffects.tagged)"));
    }
    @Override public void marker(ActorHandle target, String id, int ticks, int amplifier) {
        var entity = resolve(target); if (entity == null) return;
        var marker = mobEffectHolder(id);
        if (ticks == 0) entity.removeEffect(marker);
        else entity.addEffect(new net.minecraft.world.effect.MobEffectInstance(marker, ticks, amplifier, false, true, true));
    }
    @Override public MobEffectObservation mobEffect(ActorHandle target, String id) {
        var entity = resolve(target); if (entity == null) return null;
        var key = net.minecraft.resources.ResourceLocation.tryParse(id);
        if (key == null) return null;
        var holder = net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getHolder(key).orElse(null);
        if (holder == null) return null;
        var effect = entity.getEffect(holder);
        return effect == null ? null : MinecraftEffectState.capture(entity, effect);
    }
    @Override public MobEffectObservation[] mobEffects(ActorHandle target) {
        var entity = resolve(target); if (entity == null) return new MobEffectObservation[0];
        return entity.getActiveEffects().stream().map(effect -> MinecraftEffectState.capture(entity, effect)).toArray(MobEffectObservation[]::new);
    }
    @Override public boolean removeMobEffect(ActorHandle target, String id, String expected) {
        var entity = resolve(target); if (entity == null) return false;
        var holder = mobEffectHolder(id);
        var effect = entity.getEffect(holder);
        return effect != null && MinecraftEffectState.capture(entity, effect).key().equals(expected) && entity.removeEffect(holder);
    }
    @Override public long leaseMobEffect(long owner, ActorHandle target, String id, String expected) {
        var entity = resolve(target);
        return entity == null ? 0 : mobEffectLeases.bind(owner, entity, mobEffectHolder(id), expected);
    }
    @Override public boolean mobEffectLeasePresent(ActorHandle observer, long token) { return mobEffectLeases.present(observer, token); }
    @Override public boolean releaseMobEffectLease(long owner, long token) { return mobEffectLeases.release(owner, token); }
    public void savingMobEffects(LivingEntity entity, net.minecraft.nbt.CompoundTag data) { mobEffectLeases.saving(entity, data); }
    /** Runs on the effect's own application interval; rejection preserves its native duration clock. */
    public boolean mobEffectTick(LivingEntity entity, net.minecraft.world.effect.MobEffect effect, int amplifier) {
        if (!CombatServices.CONTENT.ready() || !CombatServices.domain(entity).available(entity)) return true;
        var data = new com.google.gson.JsonObject();
        data.addProperty("id", net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getKey(effect).toString());
        data.addProperty("amplifier", amplifier);
        var actor = bind(entity);
        return runtime.event("world_combat:mob_effect_tick", actor, actor, data.toString(), true).rejection().isEmpty();
    }
    /**
     * Fires on the next server tick after an effect left the entity by expiry (`cause` "expired"), a cure (milk, /effect
     * clear) or a scripted removal. Content may write the world: what an ailment does when it runs its course starts here.
     */
    public void mobEffectEnded(LivingEntity entity, net.minecraft.world.effect.MobEffectInstance effect, String cause) {
        endedEffects.add(() -> mobEffectLeases.reconcile(entity, effect.getEffect()));
        if (!CombatServices.CONTENT.ready() || !CombatServices.domain(entity).available(entity)) return;
        var data = new com.google.gson.JsonObject();
        data.addProperty("id", net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString());
        data.addProperty("amplifier", effect.getAmplifier());
        data.addProperty("cause", cause);
        var actor = bind(entity);
        endedEffects.add(() -> { if (resolve(actor) != null) runtime.event("world_combat:mob_effect_removed", actor, actor, data.toString(), true); });
    }
    private final java.util.ArrayDeque<Runnable> endedEffects = new java.util.ArrayDeque<>();
    /** Fires on the next server tick after a Minecraft effect was added to (or upgraded on) the entity. */
    public void mobEffectAdded(LivingEntity entity, net.minecraft.world.effect.MobEffectInstance effect, net.minecraft.world.effect.MobEffectInstance previous) {
        mobEffectReapplied(entity, effect);
        if (!CombatServices.CONTENT.ready() || !CombatServices.domain(entity).available(entity)) return;
        var data = new com.google.gson.JsonObject();
        data.addProperty("id", net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString());
        data.addProperty("amplifier", effect.getAmplifier());
        data.addProperty("duration", effect.getDuration());
        data.addProperty("replaced", previous != null);
        var actor = bind(entity);
        endedEffects.add(() -> { if (resolve(actor) != null) runtime.event("world_combat:mob_effect_added", actor, actor, data.toString(), true); });
    }
    public void mobEffectReapplied(LivingEntity entity, net.minecraft.world.effect.MobEffectInstance effect) {
        MinecraftEffectState.applied(entity, effect);
        mobEffectLeases.applied(entity, effect.getEffect());
    }
    private final java.util.LinkedHashSet<LivingEntity> changedActors = new java.util.LinkedHashSet<>();
    /**
     * Marks the actor's own facts (health, level, status, moves, held item, form, anything a domain tracks) as changed.
     * Domains call this from whatever change notification they have; `world_combat:actor_changed` fires once per actor
     * on the next tick, however many fields moved. Content that keeps derived state consistent listens here.
     */
    public void actorChanged(LivingEntity entity) {
        if (entity == null || entity.level().isClientSide) return;
        changedActors.add(entity);
    }
    private void flushChangedActors() {
        if (changedActors.isEmpty()) return;
        var batch = List.copyOf(changedActors); changedActors.clear();
        if (!CombatServices.CONTENT.ready() || !CombatServices.CONTENT.hooks().has("world_combat:actor_changed")) return;
        for (var entity : batch)
            if (CombatServices.domain(entity).available(entity)) runtime.event("world_combat:actor_changed", bind(entity), null, "{}", true);
    }
    public void incoming(net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent event) {
        var victim = event.getEntity(); var cause = event.getSource(); float amount = event.getAmount();
        if (!CombatServices.CONTENT.ready() || !CombatServices.domain(victim).available(victim)) return;
        var source = cause.getEntity() instanceof LivingEntity living && living.level() == victim.level() && living.distanceToSqr(victim) <= 64 * 64
            && CombatServices.domain(living).available(living) ? living : victim;
        boolean contextual = damageRecipient == victim && damageContext == cause;
        var data = com.google.gson.JsonParser.parseString(contextual ? damageMetadata : "{}").getAsJsonObject();
        data.addProperty("amount", (double) amount); data.addProperty("cause", healthCause.isEmpty() ? cause.getMsgId() : healthCause);
        NativeDamageFacts.add(data, cause, victim, source == cause.getEntity() ? bind(source).ref() : "");
        var result = runtime.event("world_combat:damage_incoming", bind(source), bind(victim), data.toString(), true);
        if (!result.rejection().isEmpty()) { event.setAmount(0); return; }
        var finalData = com.google.gson.JsonParser.parseString(result.data()).getAsJsonObject();
        double value = finalData.get("amount").getAsDouble();
        damageTickets.computeIfAbsent(cause, key -> new HashMap<>()).put(victim.getUUID(), new DamageTicket(bind(source), bind(victim), victim.getHealth(), result.data()));
        event.setAmount(Double.isFinite(value) && value >= 0 && value <= Float.MAX_VALUE ? (float) value : 0);
        if (contextual && event.getAmount() > 0) ArmorProjection.apply(event, finalData);
    }
    public void applied(LivingEntity victim, net.minecraft.world.damagesource.DamageSource cause) {
        var group = damageTickets.get(cause); if (group == null) return;
        var ticket = group.remove(victim.getUUID()); if (group.isEmpty()) damageTickets.remove(cause);
        if (ticket == null || victim.getHealth() >= ticket.before()) return;
        var data = com.google.gson.JsonParser.parseString(ticket.data()).getAsJsonObject();
        data.addProperty("actual", ticket.before() - victim.getHealth()); data.addProperty("before", ticket.before()); data.addProperty("after", victim.getHealth());
        var position = victim.getBoundingBox().getCenter();
        data.addProperty("x", position.x); data.addProperty("y", position.y); data.addProperty("z", position.z);
        String previous = damageMetadata; damageMetadata = "{}";
        try { runtime.event("world_combat:damage_applied", ticket.source(), ticket.target(), data.toString(), true); }
        finally { damageMetadata = previous; }
    }

    @Override public void report(long instance, String content, String message, Throwable error) {
        String context = "WorldCombat instance=" + instance + " content=" + content + " " + message;
        if (error == null) WorldCombatCore.LOGGER.info(context);
        else ConsoleJS.SERVER.error(context, error);
    }

    public static Point point(Vec3 vec) { return new Point(vec.x, vec.y, vec.z); }
    public static Vec3 vec(Point point) { return new Vec3(point.x(), point.y(), point.z()); }
}
