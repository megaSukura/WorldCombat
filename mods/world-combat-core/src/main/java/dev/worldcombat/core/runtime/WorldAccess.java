package dev.worldcombat.core.runtime;

import dev.worldcombat.core.runtime.effect.*;
import java.util.*;

/** Shared, scoped world capabilities used by actions, effects and script decisions. */
public final class WorldAccess {
    private final ActionRuntime runtime;
    private final ActorHandle source;
    private final UUID controller;
    private final Runnable guard;
    private final boolean writable;
    private final long owner;
    private final long epoch;
    public WorldAccess(ActionRuntime runtime, ActorHandle source, UUID controller, Runnable guard, boolean writable, long owner) {
        this.runtime = runtime; this.source = source; this.controller = controller; this.guard = guard;
        this.writable = writable; this.owner = owner; epoch = runtime.content.epoch();
    }
    public void check() {
        runtime.host.checkThread(); guard.run();
        if (epoch != runtime.content.epoch() || !runtime.content.ready()) throw new ActionInactiveException("World scope expired");
    }
    public ActorHandle source() { check(); return source; }
    public long tick() { check(); return runtime.now(); }
    public boolean valid(ActorHandle target) { check(); return runtime.host.valid(target) && runtime.host.sameWorld(source, target); }
    public void requireMutation(ActorHandle target) {
        check();
        if (!writable) throw new IllegalStateException("This observation is read-only");
        if (!runtime.host.valid(source) || !runtime.host.mayAct(source, controller)) throw new ActionInactiveException("Source unavailable");
        if (!runtime.host.valid(target) || !runtime.host.sameWorld(source, target)) throw new ActionInactiveException("Target unavailable");
        nearby(runtime.host.position(target));
    }
    /** Adapter resources follow the same owner release as attributes, helpers and presentations. */
    public void lease(ActorHandle target, Runnable cleanup) {
        requireMutation(target);
        if (owner == 0 || cleanup == null) throw new IllegalArgumentException("A lifecycle owner is required for a resource lease");
        runtime.host.lease(owner, cleanup);
    }
    private void nearby(Point point) {
        if (point == null || !Double.isFinite(point.length()) || point.minus(runtime.host.position(source)).length() > 64)
            throw new ActionRejectedException("out-of-range");
    }
    public WorldObservation observe(ActorHandle target) { check(); return runtime.host.observe(source, target); }
    public EquipmentObservation[] equipment(ActorHandle target) { check(); return runtime.host.equipment(source, target); }
    /**
     * Compare-and-set removal of a native equipment stack from any source. {@code provider} is the snapshot's
     * {@code provider()}, {@code slot}/{@code index} its slot, and {@code expected} the exact stack from
     * {@code equipment(...).stack().serialized()} (empty string requires an empty slot). False means the snapshot
     * went stale, the source is read-only, or the provider's native rules refused.
     */
    public boolean equipmentTake(ActorHandle target, String provider, String slot, int index, String expected) {
        return equipmentTake(target, provider, slot, index, expected, 0);
    }
    /** Same CAS removal, limited to {@code count} items when positive (the source keeps its remainder). */
    public boolean equipmentTake(ActorHandle target, String provider, String slot, int index, String expected, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192);
        return runtime.host.equipmentTake(target, provider, slot, index, expected == null ? "" : expected, count);
    }
    /** Same CAS removal, dropped as a real native item entity (`data` pickupDelay/velocity/glow); returns its UUID or "". */
    public String equipmentDrop(ActorHandle target, String provider, String slot, int index, String expected, String data) {
        return equipmentDrop(target, provider, slot, index, expected, data, 0);
    }
    /** Same native drop, dropping at most {@code count} items when positive. */
    public String equipmentDrop(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192); json(data, 512);
        return runtime.host.equipmentDrop(target, provider, slot, index, expected == null ? "" : expected, data, count);
    }
    /** CAS install of an item id or serialized stack where {@code expected} sits; false is the same clear refusal. */
    public boolean equipmentGive(ActorHandle target, String provider, String slot, int index, String expected, String item) {
        return equipmentGive(target, provider, slot, index, expected, item, 0);
    }
    /** Same CAS install, capping the installed stack to {@code count} items when positive. */
    public boolean equipmentGive(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192); itemInput(item);
        return runtime.host.equipmentGive(target, provider, slot, index, expected == null ? "" : expected, item, count);
    }
    /** Atomic swap of two native equipment stacks; a refused exchange leaves both where they were. */
    public boolean equipmentExchange(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                     ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return equipmentExchange(first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, 0);
    }
    /** Same atomic swap, moving at most {@code count} items per side when positive and only one side holds something. */
    public boolean equipmentExchange(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                     ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) {
        requireMutation(first); requireMutation(second); selector(firstProvider, firstSlot); selector(secondProvider, secondSlot);
        json(firstExpected, 8192); json(secondExpected, 8192);
        return runtime.host.equipmentExchange(first, firstProvider, firstSlot, firstIndex, firstExpected == null ? "" : firstExpected,
            second, secondProvider, secondSlot, secondIndex, secondExpected == null ? "" : secondExpected, count);
    }
    /**
     * Readable receipt for the same CAS removal: JSON `{ok,reason,item,count,drop}`, where `item`/`count` describe the
     * stack that left the slot and `reason` is the refusal when `ok` is false. Use it when a move reacts to why a
     * native rule or a stale snapshot refused; the boolean `equipmentTake` covers the plain success case.
     */
    public String equipmentTakeResult(ActorHandle target, String provider, String slot, int index, String expected) {
        return equipmentTakeResult(target, provider, slot, index, expected, 0);
    }
    /** Readable receipt for the same partial removal; a positive {@code count} keeps the source remainder. */
    public String equipmentTakeResult(ActorHandle target, String provider, String slot, int index, String expected, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192);
        return runtime.host.equipmentTakeResult(target, provider, slot, index, expected == null ? "" : expected, count);
    }
    /** Readable receipt for the CAS drop; `drop` is the item entity UUID, `reason` the refusal. */
    public String equipmentDropResult(ActorHandle target, String provider, String slot, int index, String expected, String data) {
        return equipmentDropResult(target, provider, slot, index, expected, data, 0);
    }
    /** Readable receipt for the partial CAS drop. */
    public String equipmentDropResult(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192); json(data, 512);
        return runtime.host.equipmentDropResult(target, provider, slot, index, expected == null ? "" : expected, data, count);
    }
    /** Readable receipt for the CAS install; `item`/`count` describe the stack the slot held before the write. */
    public String equipmentGiveResult(ActorHandle target, String provider, String slot, int index, String expected, String item) {
        return equipmentGiveResult(target, provider, slot, index, expected, item, 0);
    }
    /** Readable receipt for the capped CAS install. */
    public String equipmentGiveResult(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) {
        requireMutation(target); selector(provider, slot); json(expected, 8192); itemInput(item);
        return runtime.host.equipmentGiveResult(target, provider, slot, index, expected == null ? "" : expected, item, count);
    }
    /** Readable receipt for the atomic swap; `reason` covers same-slot, stale, empty, capacity, preflight and write refusals. */
    public String equipmentExchangeResult(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                          ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return equipmentExchangeResult(first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, 0);
    }
    /** Readable receipt for the partial or whole atomic swap. */
    public String equipmentExchangeResult(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                          ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) {
        requireMutation(first); requireMutation(second); selector(firstProvider, firstSlot); selector(secondProvider, secondSlot);
        json(firstExpected, 8192); json(secondExpected, 8192);
        return runtime.host.equipmentExchangeResult(first, firstProvider, firstSlot, firstIndex, firstExpected == null ? "" : firstExpected,
            second, secondProvider, secondSlot, secondIndex, secondExpected == null ? "" : secondExpected, count);
    }
    private static void selector(String provider, String slot) {
        if (provider == null || provider.isBlank() || slot == null || slot.isBlank()) throw new IllegalArgumentException("Invalid equipment selector");
    }
    /**
     * Read-only probe: the full `width` x `height` bounding box fits with feet centre at `point` in this dimension.
     * Width and height are finite positive lengths; the probe covers every chunk the box overlaps, the build height,
     * the world border and both block and living collisions. The point stays within the host-authorized 64-block scope.
     */
    public boolean freeSpace(Point point, double width, double height) {
        check(); nearby(point);
        if (!Double.isFinite(width) || !(width > 0) || !Double.isFinite(height) || !(height > 0))
            throw new IllegalArgumentException("Free-space probe outside bounds");
        return runtime.host.freeSpace(source, point, width, height);
    }
    /** Whether two loaded actors are allies; unlike friendly(target) this does not depend on the current source. */
    public boolean allied(ActorHandle first, ActorHandle second) {
        check();
        if (!runtime.host.valid(first) || !runtime.host.valid(second) || !runtime.host.sameWorld(first, second)) return false;
        return runtime.host.friendly(first, second);
    }
    public AttributeObservation attributeValue(ActorHandle target, String id) {
        check(); EffectData.id(id); return runtime.host.attributeValue(source, target, id);
    }
    public MobEffectObservation mobEffect(ActorHandle target, String id) {
        check(); EffectData.id(id);
        if (!runtime.host.valid(target) || !runtime.host.sameWorld(source, target)) return null;
        nearby(runtime.host.position(target)); return runtime.host.mobEffect(target, id);
    }
    public MobEffectObservation[] mobEffects(ActorHandle target) {
        check();
        if (!runtime.host.valid(target) || !runtime.host.sameWorld(source, target)) return new MobEffectObservation[0];
        nearby(runtime.host.position(target)); return runtime.host.mobEffects(target);
    }
    public boolean removeMobEffect(ActorHandle target, String id, String expected) {
        requireMutation(target); EffectData.id(id);
        if (expected == null) throw new IllegalArgumentException("Invalid effect comparison key");
        return runtime.host.removeMobEffect(target, id, expected);
    }
    /** Native environmental facts at a loaded position; interpretation belongs to content. */
    public String environment(Point point) { check(); nearby(point); return runtime.host.environment(source, point); }
    public BlockObservation block(Point point) { check(); nearby(point); return runtime.host.block(source, point); }
    public RegistryObservation registry(String registry, String id) {
        check(); EffectData.id(registry); EffectData.id(id); return runtime.host.registry(source, registry, id);
    }
    public ItemObservation item(String id) { check(); itemInput(id); return runtime.host.item(source, id); }
    public FluidObservation fluid(Point point) { check(); nearby(point); return runtime.host.fluid(source, point); }
    public RegistryObservation entityType(ActorHandle target) {
        check();
        if (!runtime.host.valid(target) || !runtime.host.sameWorld(source, target)) return null;
        nearby(runtime.host.position(target)); return runtime.host.entityType(target);
    }
    private static void itemInput(String value) {
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("Invalid item input");
        if (value.startsWith("{")) json(value, 65536); else EffectData.id(value);
    }
    public String useItem(Point point, String item, String expected) {
        requireMutation(source); nearby(point); EffectData.id(item);
        if (expected == null || expected.length() > 4096) throw new IllegalArgumentException("Invalid block comparison state");
        return runtime.host.useItem(source, controller, point, item, expected);
    }
    public String interactBlock(Point point, String face, boolean secondary, String expected) {
        requireMutation(source); nearby(point);
        if (expected == null) throw new IllegalArgumentException("Missing block comparison state");
        return runtime.host.interactBlock(source, controller, point, face, secondary, expected);
    }
    public EnergyObservation energy(Point point, String side) { check(); nearby(point); return runtime.host.energy(source, point, side); }
    public int receiveEnergy(Point point, String side, int amount, boolean simulate) {
        requireMutation(source); nearby(point);
        if (amount < 0) throw new IllegalArgumentException("Energy amount must be non-negative");
        return runtime.host.receiveEnergy(source, controller, point, side, amount, simulate);
    }
    public void face(Point point, double yawSpeed, double pitchSpeed) {
        requireMutation(source); nearby(point); validateTurn(yawSpeed, pitchSpeed);
        if (!runtime.controlAllowed(owner, source, "aim")) return;
        runtime.host.face(source, point, yawSpeed, pitchSpeed);
    }
    static void validateTurn(double yawSpeed, double pitchSpeed) {
        if (!Double.isFinite(yawSpeed) || !Double.isFinite(pitchSpeed) || yawSpeed <= 0 || yawSpeed > 180 || pitchSpeed <= 0 || pitchSpeed > 180)
            throw new IllegalArgumentException("Turn rate outside bounds");
    }
    public ActorHandle actor(String entity) {
        check();
        var parts = entity.split("/", -1);
        if (parts.length > 2) throw new IllegalArgumentException("Invalid actor reference");
        var actor = runtime.host.actorNear(source, UUID.fromString(parts[0]));
        return actor != null && (parts.length == 1 || actor.generation() == Long.parseLong(parts[1])) ? actor : null;
    }
    public ActorHandle[] query(Point centre, double radius, boolean visibleOnly) {
        check(); nearby(centre);
        if (!Double.isFinite(radius) || radius <= 0 || radius > 32) throw new IllegalArgumentException("Query radius outside bounds");
        return runtime.host.query(source, centre, radius, visibleOnly);
    }
    /**
     * One call that observes everyone `query` would return, as a JSON array of plain subjects. Behavior code reads a
     * whole neighbourhood per decision; assembling it here keeps that a single crossing into the script engine.
     * `effects` / `mobEffects` are comma-separated ids whose presence on each subject is reported in the arrays of the
     * same names. Each subject: `ref, domain, point[x,y,z], velocity[x,y,z], health, maximum, speed, visible, friendly, hostile, player, wet,
     * grounded, attacking, lastAttacker, hurtAgo, width, height, tags, effects[], mobEffects[]`.
     */
    public String survey(Point centre, double radius, boolean visibleOnly, int limit, String effects, String mobEffects) {
        var handles = query(centre, radius, visibleOnly);
        var effectIds = effects == null || effects.isBlank() ? new String[0] : effects.split(",");
        var mobEffectIds = mobEffects == null || mobEffects.isBlank() ? new String[0] : mobEffects.split(",");
        for (var id : effectIds) EffectData.id(id.trim());
        for (var id : mobEffectIds) EffectData.id(id.trim());
        var out = new com.google.gson.JsonArray();
        for (var handle : handles) {
            if (out.size() >= Math.max(1, limit)) break;
            var view = runtime.host.observe(source, handle);
            if (view == null) continue;
            var subject = new com.google.gson.JsonObject();
            subject.addProperty("ref", handle.ref());
            subject.addProperty("domain", handle.domain());
            var point = new com.google.gson.JsonArray(); point.add(view.position().x()); point.add(view.position().y()); point.add(view.position().z());
            subject.add("point", point);
            var velocity = new com.google.gson.JsonArray(); velocity.add(view.velocity().x()); velocity.add(view.velocity().y()); velocity.add(view.velocity().z());
            subject.add("velocity", velocity);
            subject.addProperty("health", view.health()); subject.addProperty("maximum", view.maxHealth());
            subject.addProperty("speed", view.movementSpeed()); subject.addProperty("visible", view.visible());
            subject.addProperty("friendly", view.friendly()); subject.addProperty("hostile", view.hostile());
            subject.addProperty("player", view.player()); subject.addProperty("wet", view.wet()); subject.addProperty("grounded", view.grounded());
            subject.addProperty("attacking", view.attacking() == null ? "" : view.attacking().ref());
            subject.addProperty("lastAttacker", view.lastAttacker() == null ? "" : view.lastAttacker().ref());
            subject.addProperty("hurtAgo", view.hurtAgo()); subject.addProperty("width", view.width()); subject.addProperty("height", view.height());
            subject.addProperty("tags", view.tags());
            var present = new com.google.gson.JsonArray();
            for (var id : effectIds) if (runtime.effects().query(handle, id.trim()).length > 0) present.add(id.trim());
            subject.add("effects", present);
            var presentMob = new com.google.gson.JsonArray();
            for (var id : mobEffectIds) if (runtime.host.mobEffect(handle, id.trim()) != null) presentMob.add(id.trim());
            subject.add("mobEffects", presentMob);
            subject.add("facts", runtime.host.facts(handle));
            out.add(subject);
        }
        return out.toString();
    }
    public boolean visible(ActorHandle target) { check(); return runtime.host.visible(source, target); }
    public boolean clear(Point from, Point to) { check(); nearby(from); nearby(to); return runtime.host.clear(source, from, to); }
    public void sound(String sound, Point point, double radius, String data) {
        requireMutation(source); nearby(point); EffectData.id(sound);
        if (!Double.isFinite(radius) || radius < 1 || radius > 32) throw new IllegalArgumentException("Sound radius outside bounds");
        runtime.host.sound(source, sound, point, radius, EffectData.copy(data));
    }
    public SoundObservation[] heard(long after, double radius) {
        check(); if (!Double.isFinite(radius) || radius <= 0 || radius > 32) throw new IllegalArgumentException("Hearing radius outside bounds");
        return runtime.host.heard(source, after, radius);
    }
    public boolean friendly(ActorHandle target) { check(); return runtime.host.friendly(source, target); }
    public double random() { check(); return runtime.host.random(source); }
    public String navigate(Point point, double within, double speed) {
        requireMutation(source); nearby(point);
        if (!runtime.controlAllowed(owner, source, "movement") || !runtime.controlAllowed(owner, source, "aim")) return "busy";
        if (!Double.isFinite(within) || within < 0.25 || within > 32 || !Double.isFinite(speed) || speed < 0 || speed > 3)
            throw new IllegalArgumentException("Invalid navigation request");
        return runtime.host.navigate(source, point, within, speed);
    }
    public void stopMovement() { stopMovement(source); }
    public void stopMovement(ActorHandle target) { requireMutation(target); if (!target.equals(source) || runtime.controlAllowed(owner, source, "movement")) runtime.host.stopMovement(target); }
    public boolean attribute(ActorHandle target, String id, double amount, String operation) {
        requireMutation(target); EffectData.id(id);
        if (!Double.isFinite(amount) || Math.abs(amount) > 1000) throw new IllegalArgumentException("Invalid attribute modifier");
        return runtime.host.attribute(owner, target, id, amount, operation);
    }
    public void controlled(boolean value) {
        requireMutation(source);
        if (value && owner > 0) runtime.controlAllowed(owner, source, "movement");
        runtime.host.controlled(owner, source, value);
    }
    private boolean move(ActorHandle target) { return !target.equals(source) || runtime.controlAllowed(owner, source, "movement"); }
    public double displace(ActorHandle target, Point delta) {
        requireMutation(target);
        if (!move(target)) return 0;
        if (!Double.isFinite(delta.length()) || delta.length() > 4) throw new IllegalArgumentException("Displacement exceeds step budget");
        return runtime.host.displace(source, target, delta, controller);
    }
    public boolean teleport(ActorHandle target, Point point) { requireMutation(target); nearby(point); return move(target) && runtime.host.teleport(source, target, point, controller); }
    public boolean swap(ActorHandle first, ActorHandle second) { requireMutation(first); requireMutation(second); return move(first) && move(second) && runtime.host.swap(source, first, second, controller); }
    public double health(ActorHandle target, double delta, String cause) {
        requireMutation(target); EffectData.id(cause);
        if (delta == 0) return 0;
        NativeAmounts.delta(delta);
        return runtime.host.health(source, target, controller, delta, cause);
    }
    public boolean hurt(ActorHandle target, double amount, String metadata) {
        requireMutation(target);
        if (amount == 0) return false;
        NativeAmounts.positive(amount);
        return runtime.host.damage(source, target, controller, amount, EffectData.copy(metadata));
    }
    /** Named handlers belong to the enclosing managed effect; bare hooks attach an effect first. */
    public String projectile(Point origin, Point velocity, double gravity, double radius, double range, int lifetime,
                             String hit, String complete, String input, String appearance) {
        requireMutation(source);
        if (owner >= 0) throw new IllegalStateException("Named projectile handlers require a managed effect scope");
        return runtime.effects().projectile(-owner, origin, velocity, gravity, radius, range, lifetime, hit, complete, input, appearance);
    }
    public boolean projectileHit(Impact impact, double amount, String metadata) { requireMutation(source); return runtime.projectiles().hit(owner, impact, amount, metadata); }
    public boolean projectileActive(String id) { check(); return runtime.projectiles().active(owner, id); }
    public boolean cancelProjectile(String id) { requireMutation(source); return runtime.projectiles().cancel(owner, id); }
    public boolean finishProjectile(String id) { requireMutation(source); return runtime.projectiles().finish(owner, id); }
    public boolean deliver(ActorHandle target, String event) {
        requireMutation(target); EffectData.id(event); return runtime.deliver(target, event);
    }
    public boolean interrupt(ActorHandle target, String reason) {
        requireMutation(target); refusalReason(reason); return runtime.interrupt(target, reason);
    }
    public boolean deliver(ActorHandle target, long instance, String event) {
        requireMutation(target); EffectData.id(event); return runtime.deliver(target, instance, event);
    }
    public boolean interrupt(ActorHandle target, long instance, String reason) {
        requireMutation(target); refusalReason(reason); return runtime.interrupt(target, instance, reason);
    }
    private static void refusalReason(String reason) {
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Expected an interruption reason");
    }
    public void marker(ActorHandle target, String id, int ticks, int amplifier) {
        requireMutation(target); EffectData.id(id);
        if (ticks < -1 || ticks > 1728000 || amplifier < 0 || amplifier > 255) throw new IllegalArgumentException("Invalid marker");
        runtime.host.marker(target, id, ticks, amplifier);
    }
    public long terrain(String cells, int ticks) {
        requireMutation(source);
        if (ticks < 1 || ticks > 12000) throw new IllegalArgumentException("Invalid terrain lifetime");
        return runtime.host.terrain(owner, source, controller, EffectData.copy(cells), ticks);
    }
    public String terrainResult(String cells, int ticks) {
        requireMutation(source);
        if (ticks < 1 || ticks > 12000) throw new IllegalArgumentException("Invalid terrain lifetime");
        return runtime.host.terrainResult(owner, source, controller, EffectData.copy(cells), ticks);
    }
    public void removeTerrain(long id) { requireMutation(source); runtime.host.removeTerrain(source, id); }
    public ActorHandle helper(Point point, double health, String data, int ticks) {
        requireMutation(source); nearby(point);
        NativeAmounts.positive(health);
        if (ticks < 1 || ticks > 12000) throw new IllegalArgumentException("Invalid helper lifetime");
        return runtime.host.helper(owner, source, point, health, EffectData.copy(data), ticks);
    }
    public void removeHelper(ActorHandle target) { requireMutation(source); runtime.host.removeHelper(source, target); }
    /**
     * Spawns a persistent body at `point`. `body` configures the entity (appearance, size, health, physics, name);
     * `definition` is a persistent effect that becomes the body's brain with `data` as its state and `ticks` its lifetime.
     * The body belongs to itself: it survives this action, the summoner's recall and server restarts, and leaves
     * when the brain ends, it dies or it is dismissed.
     */
    public ActorHandle spawn(Point point, String body, String definition, String data, int ticks) {
        requireMutation(source); nearby(point); EffectData.id(definition);
        if (body == null || body.length() > 4096) throw new IllegalArgumentException("Invalid body configuration");
        if (ticks < 1 || ticks > 1200000) throw new IllegalArgumentException("Invalid body lifetime");
        return runtime.host.spawnBody(source, controller, point, EffectData.copy(body), definition, EffectData.copy(data), ticks);
    }
    /** JSON `{definition, brain, summoner, owner, config}` for a body, empty for any other actor. */
    public String body(ActorHandle target) { check(); return runtime.host.bodyInfo(target); }
    public boolean configure(ActorHandle target, String json) {
        requireMutation(target);
        if (json == null || json.length() > 4096) throw new IllegalArgumentException("Invalid body configuration");
        return runtime.host.configureBody(target, EffectData.copy(json));
    }
    public boolean dismiss(ActorHandle target) { requireMutation(target); return runtime.host.dismissBody(source, target); }
    /** Sets (or adds to) an actor's velocity in blocks per tick; the length is capped at 4. */
    public boolean motion(ActorHandle target, Point velocity, boolean add) {
        requireMutation(target);
        if (!move(target)) return false;
        if (!Double.isFinite(velocity.length()) || velocity.length() > 4) throw new IllegalArgumentException("Velocity exceeds the step budget");
        return runtime.host.motion(target, velocity, add);
    }
    private static void json(String value, int limit) { if (value == null || value.length() > limit) throw new IllegalArgumentException("Invalid JSON argument"); }
    /** Places a block state lastingly (protection mods and the mobGriefing rule apply). Empty result = placed, otherwise the reason. */
    public String placeBlock(Point point, String state, String data) {
        requireMutation(source); nearby(point); json(state, 512); json(data, 512);
        return runtime.host.placeBlock(source, controller, point, state, EffectData.copy(data));
    }
    public String breakBlock(Point point, boolean drops) { requireMutation(source); nearby(point); return runtime.host.breakBlock(source, controller, point, drops); }
    /** Block entity NBT as JSON; `{}` for plain blocks, empty for unloaded positions. */
    public String blockData(Point point) { check(); nearby(point); return runtime.host.blockData(source, point); }
    public String setBlockData(Point point, String data) {
        requireMutation(source); nearby(point); json(data, 8192);
        return runtime.host.setBlockData(source, controller, point, EffectData.copy(data));
    }
    /** Container slots `[{item,count},...]` of chests, hoppers, furnaces and mod machines. */
    public String container(Point point) { check(); nearby(point); return runtime.host.container(source, point); }
    public int insertItem(Point point, String item, int count) { requireMutation(source); nearby(point); itemInput(item); return runtime.host.insertItem(source, controller, point, item, count); }
    public String extractItem(Point point, int slot, int count) { requireMutation(source); nearby(point); return runtime.host.extractItem(source, controller, point, slot, count); }
    /** Drops an item entity (`data`: pickupDelay, velocity [x,y,z], glow); returns its UUID. */
    public String dropItem(Point point, String item, int count, String data) {
        requireMutation(source); nearby(point); itemInput(item); json(data, 512);
        if (count < 1 || count > 64) throw new IllegalArgumentException("Item count outside 1..64");
        return runtime.host.dropItem(source, point, item, count, EffectData.copy(data));
    }
    /** Puts items into a player's inventory; other actors take nothing (drop instead). */
    public int giveItem(ActorHandle target, String item, int count) {
        requireMutation(target); itemInput(item);
        if (count < 1 || count > 64) throw new IllegalArgumentException("Item count outside 1..64");
        return runtime.host.giveItem(target, item, count);
    }
    /** Explosion with native knockback and shockwave (`data`: fire, blocks "none"|"break"); power 0.1..8. */
    public boolean explode(Point point, double power, String data) {
        requireMutation(source); nearby(point); json(data, 256);
        if (!Double.isFinite(power) || power <= 0 || power > 8) throw new IllegalArgumentException("Explosion power outside bounds");
        return runtime.host.explode(source, point, power, EffectData.copy(data));
    }
    /** Lightning strike; visual-only bolts leave damage and fire to content. */
    public boolean lightning(Point point, boolean visualOnly) { requireMutation(source); nearby(point); return runtime.host.lightning(source, controller, point, visualOnly); }
    /** Sets an actor on fire for `ticks` (0 extinguishes). */
    public boolean ignite(ActorHandle target, int ticks) {
        requireMutation(target);
        if (ticks < 0 || ticks > 6000) throw new IllegalArgumentException("Fire duration outside bounds");
        return runtime.host.ignite(target, ticks);
    }
    /** Points a mob's hostility at a target (null calms it). */
    public boolean target(ActorHandle actor, ActorHandle target) {
        requireMutation(actor); if (target != null) requireMutation(target);
        if (!move(actor)) return false;
        return runtime.host.target(actor, target);
    }
    /** Dimension weather: clear | rain | thunder for `ticks` (20..168000). */
    public boolean weather(String weather, int ticks) {
        requireMutation(source);
        if (weather == null || ticks < 20 || ticks > 168000) throw new IllegalArgumentException("Invalid weather request");
        return runtime.host.weather(source, weather, ticks);
    }
    /** Seats `rider` on `vehicle`; a null vehicle dismounts. */
    public boolean mount(ActorHandle rider, ActorHandle vehicle) {
        requireMutation(rider); if (vehicle != null) requireMutation(vehicle);
        if (!move(rider)) return false;
        return runtime.host.mount(rider, vehicle);
    }
    public ActorHandle helperSource(ActorHandle target) { check(); return runtime.host.helperSource(target); }
    public String helperData(ActorHandle target) { check(); return runtime.host.helperData(target); }
    public long effect(String definition, ActorHandle target, String data, int ticks) {
        requireMutation(target); return runtime.effects().create(definition, source, target, controller, owner > 0 ? owner : 0, data, ticks);
    }
    public EffectRuntime.View[] effects(ActorHandle target, String definition) {
        check();
        var observation = runtime.host.observe(source, target);
        if (observation == null) return new EffectRuntime.View[0];
        return runtime.effects().query(target, definition);
    }
    public EffectRuntime.View[] effectsOfType(String definition) {
        check();
        if (!runtime.host.valid(source)) return new EffectRuntime.View[0];
        return runtime.effects().queryDefinition(source, definition);
    }
    public boolean operation(long id, String operation, String data) {
        requireMutation(source); return runtime.effects().operate(id, operation, source, controller, data);
    }
    public String signal(String event, int version, ActorHandle target, String data) {
        requireMutation(target); return runtime.effects().emit(event, version, source, target, controller, data, "scope", owner);
    }
    public void particle(Point point) { check(); nearby(point); runtime.host.particle(source, point); }
    public void present(String key, String type, int version, Point point, String data) {
        requireMutation(source); nearby(point); EffectData.key(key); EffectData.id(type);
        if (version < 1 || version > 1000 || data == null || data.length() > 2048) throw new IllegalArgumentException("Invalid presentation");
        runtime.host.present(owner, source, key, type, version, point, EffectData.copy(data));
    }
    /** A bounded receipt survives owner release; the wire includes the release tick and reason. */
    public void presentFor(String key, String type, int version, Point point, String data, int ticks) {
        requireMutation(source); nearby(point); EffectData.key(key); EffectData.id(type);
        if (owner == 0 || version < 1 || version > 1000 || data == null || data.length() > 4096 || ticks < 1 || ticks > 200)
            throw new IllegalArgumentException("Invalid presentation receipt");
        runtime.host.presentFor(owner, source, key, type, version, point, EffectData.copy(data), ticks);
    }
    public long cast(String action, ActorHandle target, Point point, Point direction, String arguments) {
        requireMutation(source);
        return runtime.start(action, source, target == null ? ActionTarget.point(point, direction) : ActionTarget.entity(target, point, direction), controller, arguments(arguments));
    }
    static Map<String, String> arguments(String arguments) {
        var values = com.google.gson.JsonParser.parseString(EffectData.copy(arguments)).getAsJsonObject();
        var args = new LinkedHashMap<String, String>();
        values.entrySet().forEach(entry -> { if (!entry.getValue().isJsonPrimitive()) throw new IllegalArgumentException("Action arguments must be scalar"); args.put(entry.getKey(), entry.getValue().getAsString()); });
        return args;
    }
    public boolean busy() { check(); return runtime.busy(source); }
    public boolean claimed(String claim) { check(); return runtime.claimed(source, claim); }
    public String readiness(String action) { check(); return runtime.readiness(source, action); }
    public ActionRuntime.State[] actions() { check(); return runtime.states(source); }
    public ActionRuntime.State action(long instance) { check(); return runtime.result(source, instance); }
    public long cooldown(String action) { check(); return runtime.cooldown(source, action); }

    // --- the native world -------------------------------------------------------------------------
    // Everything Minecraft and the installed mods can do is material for content. The host wraps what it
    // can guard and clean up; these hand over the raw objects for the rest. Reads are open to every scope;
    // writes belong to writable scopes, and what content changes through a raw object it also puts back.

    /** The raw entity behind an actor (or null): every vanilla and mod method is reachable. */
    public Object nativeEntity(ActorHandle target) {
        check();
        if (!runtime.host.valid(target) || !runtime.host.sameWorld(source, target)) return null;
        nearby(runtime.host.position(target));
        return runtime.host.nativeEntity(target);
    }
    /** The raw server level the source stands in. */
    public Object nativeLevel() { check(); return runtime.host.nativeLevel(source); }
    /** The raw block state at a point. */
    public Object nativeBlock(Point point) { check(); nearby(point); return runtime.host.nativeBlock(source, point, false); }
    /** The raw block entity at a point, or null. */
    public Object nativeBlockEntity(Point point) { check(); nearby(point); return runtime.host.nativeBlock(source, point, true); }
    /**
     * Raw entities of every kind within `radius` of a point: items on the ground, projectiles, boats, leash knots,
     * area clouds, bodies. `type` filters by registered entity type id; empty keeps all.
     */
    public Object[] nativeEntities(Point centre, double radius, String type) {
        check(); nearby(centre);
        if (!(radius >= 0) || radius > 64) throw new IllegalArgumentException("Invalid query radius");
        return runtime.host.nativeEntities(source, centre, radius, type == null ? "" : type);
    }
    /**
     * Spawns any registered entity type (`minecraft:tnt`, `minecraft:leash_knot`, `minecraft:area_effect_cloud`, a mod's
     * entity...) with optional NBT. `ticks` > 0 discards it after that long; 0 leaves it to its own rules. Returns the
     * raw entity, or null when the type is unknown or the spawn was refused.
     */
    public Object spawnEntity(String type, Point point, String nbt, int ticks) {
        requireMutation(source); nearby(point); EffectData.id(type);
        if (ticks < 0 || ticks > 168000) throw new IllegalArgumentException("Invalid entity lifetime");
        return runtime.host.spawnEntity(source, controller, type, point, nbt == null ? "{}" : EffectData.copy(nbt), ticks);
    }
    /** Runs a server command as the controlling player (or the server when there is none); returns the result count. */
    public int command(String command) {
        requireMutation(source);
        if (command == null || command.isBlank() || command.length() > 1024) throw new IllegalArgumentException("Invalid command");
        return runtime.host.command(source, controller, command);
    }
}
