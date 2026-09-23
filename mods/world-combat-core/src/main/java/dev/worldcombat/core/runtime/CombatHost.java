package dev.worldcombat.core.runtime;

import java.util.UUID;

public interface CombatHost {
    default String projectile(ActionContext action, Point origin, Point velocity, double gravity, double radius,
                              double range, int lifetime, java.util.function.Consumer<Impact> hit, Runnable complete, String appearance) {
        return projectile(action.id(), action.actor(), action.controller(), origin, velocity, gravity, radius, range, lifetime, hit, complete, appearance);
    }
    default String projectile(long owner, ActorHandle source, UUID controller, Point origin, Point velocity, double gravity, double radius,
                              double range, int lifetime, java.util.function.Consumer<Impact> hit, Runnable complete, String appearance) {
        throw new UnsupportedOperationException("Native projectiles are unavailable");
    }
    default boolean projectileDamage(ActionContext action, Impact impact, double amount, String metadata) { return projectileDamage(action.id(), action.actor(), action.controller(), impact, amount, metadata); }
    default boolean projectileDamage(long owner, ActorHandle source, UUID controller, Impact impact, double amount, String metadata) { throw new UnsupportedOperationException(); }
    default void removeProjectile(long owner, String id) { throw new UnsupportedOperationException(); }
    default void stopProjectile(long owner, String id) { throw new UnsupportedOperationException(); }
    default EquipmentObservation[] equipment(ActorHandle source, ActorHandle target) { return new EquipmentObservation[0]; }
    default boolean equipmentTake(ActorHandle target, String provider, String slot, int index, String expected) { return equipmentTake(target, provider, slot, index, expected, 0); }
    default String equipmentDrop(ActorHandle target, String provider, String slot, int index, String expected, String data) { return equipmentDrop(target, provider, slot, index, expected, data, 0); }
    default boolean equipmentGive(ActorHandle target, String provider, String slot, int index, String expected, String item) { return equipmentGive(target, provider, slot, index, expected, item, 0); }
    default boolean equipmentExchange(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                      ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return equipmentExchange(first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, 0);
    }
    default String equipmentTakeResult(ActorHandle target, String provider, String slot, int index, String expected) { return equipmentTakeResult(target, provider, slot, index, expected, 0); }
    default String equipmentDropResult(ActorHandle target, String provider, String slot, int index, String expected, String data) { return equipmentDropResult(target, provider, slot, index, expected, data, 0); }
    default String equipmentGiveResult(ActorHandle target, String provider, String slot, int index, String expected, String item) { return equipmentGiveResult(target, provider, slot, index, expected, item, 0); }
    default String equipmentExchangeResult(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                           ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return equipmentExchangeResult(first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected, 0);
    }
    default boolean equipmentTake(ActorHandle target, String provider, String slot, int index, String expected, int count) { throw new UnsupportedOperationException(); }
    default String equipmentDrop(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) { throw new UnsupportedOperationException(); }
    default boolean equipmentGive(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) { throw new UnsupportedOperationException(); }
    default boolean equipmentExchange(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                      ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) { throw new UnsupportedOperationException(); }
    default String equipmentTakeResult(ActorHandle target, String provider, String slot, int index, String expected, int count) { throw new UnsupportedOperationException(); }
    default String equipmentDropResult(ActorHandle target, String provider, String slot, int index, String expected, String data, int count) { throw new UnsupportedOperationException(); }
    default String equipmentGiveResult(ActorHandle target, String provider, String slot, int index, String expected, String item, int count) { throw new UnsupportedOperationException(); }
    default String equipmentExchangeResult(ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                           ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) { throw new UnsupportedOperationException(); }
    default boolean freeSpace(ActorHandle source, Point point, double width, double height) { throw new UnsupportedOperationException(); }
    boolean valid(ActorHandle handle);
    boolean mayAct(ActorHandle actor, UUID controller);
    Point position(ActorHandle handle);
    Impact trace(ActorHandle actor, UUID controller, Point from, Point to, double radius);
    default Impact moveSweep(ActorHandle actor, UUID controller, Point delta, double radius) { throw new UnsupportedOperationException(); }
    boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount);
    default boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount, String metadata) { return damage(actor, target, controller, amount); }
    void particle(ActorHandle actor, Point point);
    default void present(long owner, ActorHandle actor, String key, String type, int version, Point point, String data) { throw new UnsupportedOperationException(); }
    default void presentFor(long owner, ActorHandle actor, String key, String type, int version, Point point, String data, int ticks) { throw new UnsupportedOperationException(); }
    void report(long instance, String content, String message, Throwable error);
    default boolean friendly(ActorHandle actor, ActorHandle target) { return actor.key().equals(target.key()); }
    default boolean sameWorld(ActorHandle actor, ActorHandle target) { return true; }
    default void begin(long instance, ActorHandle actor) {}
    default void committed(ActionContext action) {}
    default void release(long instance, String reason) {}
    default void lease(long instance, Runnable cleanup) { throw new UnsupportedOperationException("Resource leases are unavailable"); }
    default String navigate(ActorHandle actor, Point point, double within, double speed) { throw new UnsupportedOperationException(); }
    default void stopMovement(ActorHandle actor) {}
    default void face(ActorHandle actor, Point point, double yawSpeed, double pitchSpeed) { throw new UnsupportedOperationException(); }
    default String environment(ActorHandle actor, Point point) { throw new UnsupportedOperationException(); }
    default BlockObservation block(ActorHandle actor, Point point) { throw new UnsupportedOperationException(); }
    default boolean canSurvive(ActorHandle actor, Point point, String state) { throw new UnsupportedOperationException(); }
    default RegistryObservation registry(ActorHandle actor, String registry, String id) { throw new UnsupportedOperationException(); }
    default ItemObservation item(ActorHandle actor, String id) { throw new UnsupportedOperationException(); }
    default FluidObservation fluid(ActorHandle actor, Point point) { throw new UnsupportedOperationException(); }
    default RegistryObservation entityType(ActorHandle actor) { throw new UnsupportedOperationException(); }
    default String useItem(ActorHandle actor, UUID controller, Point point, String item, String expected) { throw new UnsupportedOperationException(); }
    default String interactBlock(ActorHandle actor, UUID controller, Point point, String face, boolean secondary, String expected) { throw new UnsupportedOperationException(); }
    default EnergyObservation energy(ActorHandle actor, Point point, String side) { return null; }
    default int receiveEnergy(ActorHandle actor, UUID controller, Point point, String side, int amount, boolean simulate) { throw new UnsupportedOperationException(); }
    default void controlled(ActorHandle actor, boolean controlled) {}
    default void controlled(long owner, ActorHandle actor, boolean controlled) { controlled(actor, controlled); }
    default WorldObservation observe(ActorHandle source, ActorHandle target) { throw new UnsupportedOperationException(); }
    /** Domain-published public facts about the target (see {@code CombatDomain.facts}); empty when unavailable. */
    default com.google.gson.JsonObject facts(ActorHandle target) { return new com.google.gson.JsonObject(); }
    default AttributeObservation attributeValue(ActorHandle source, ActorHandle target, String id) { return null; }
    default ActorHandle actorNear(ActorHandle source, UUID entity) { return null; }
    default ActorHandle[] query(ActorHandle source, Point point, double radius, boolean visibleOnly) { throw new UnsupportedOperationException(); }
    default boolean visible(ActorHandle source, ActorHandle target) { throw new UnsupportedOperationException(); }
    default double random(ActorHandle source) { throw new UnsupportedOperationException(); }
    default double displace(ActorHandle source, ActorHandle target, Point delta, UUID controller) { throw new UnsupportedOperationException(); }
    default boolean teleport(ActorHandle source, ActorHandle target, Point point, UUID controller) { throw new UnsupportedOperationException(); }
    default boolean swap(ActorHandle source, ActorHandle first, ActorHandle second, UUID controller) { throw new UnsupportedOperationException(); }
    default double health(ActorHandle source, ActorHandle target, UUID controller, double delta, String cause) { throw new UnsupportedOperationException(); }
    default void marker(ActorHandle target, String id, int ticks, int amplifier) { throw new UnsupportedOperationException(); }
    default MobEffectObservation mobEffect(ActorHandle target, String id) { throw new UnsupportedOperationException(); }
    default String mobEffectCategory(String id) { return ""; }
    default MobEffectObservation[] mobEffects(ActorHandle target) { throw new UnsupportedOperationException(); }
    default boolean removeMobEffect(ActorHandle target, String id, String expected) { throw new UnsupportedOperationException(); }
    default long leaseMobEffect(long owner, ActorHandle target, String id, String expected) { throw new UnsupportedOperationException(); }
    default boolean mobEffectLeasePresent(ActorHandle observer, long token) { throw new UnsupportedOperationException(); }
    default boolean releaseMobEffectLease(long owner, long token) { throw new UnsupportedOperationException(); }
    default boolean attribute(long owner, ActorHandle target, String id, double amount, String operation) { throw new UnsupportedOperationException(); }
    default long terrain(long owner, ActorHandle actor, UUID controller, String cells, int ticks) { throw new UnsupportedOperationException(); }
    default String terrainResult(long owner, ActorHandle actor, UUID controller, String cells, int ticks) { throw new UnsupportedOperationException(); }
    default void removeTerrain(ActorHandle actor, long id) { throw new UnsupportedOperationException(); }
    default ActorHandle helper(long owner, ActorHandle actor, Point point, double health, String data, int ticks) { throw new UnsupportedOperationException(); }
    /** A persistent body whose brain is a persistent effect (source = target = body); it outlives owner release and restarts. */
    default ActorHandle spawnBody(ActorHandle summoner, UUID controller, Point point, String body, String definition, String data, int ticks) { throw new UnsupportedOperationException("Bodies are unavailable"); }
    default String bodyInfo(ActorHandle actor) { return ""; }
    default boolean configureBody(ActorHandle actor, String json) { return false; }
    default boolean dismissBody(ActorHandle caller, ActorHandle actor) { return false; }
    default boolean motion(ActorHandle target, Point velocity, boolean add) { throw new UnsupportedOperationException(); }
    default boolean mount(ActorHandle rider, ActorHandle vehicle) { throw new UnsupportedOperationException(); }
    default String placeBlock(ActorHandle actor, UUID controller, Point point, String state, String data) { throw new UnsupportedOperationException(); }
    default String breakBlock(ActorHandle actor, UUID controller, Point point, boolean drops) { throw new UnsupportedOperationException(); }
    default String blockData(ActorHandle actor, Point point) { throw new UnsupportedOperationException(); }
    default String setBlockData(ActorHandle actor, UUID controller, Point point, String json) { throw new UnsupportedOperationException(); }
    default String container(ActorHandle actor, Point point) { throw new UnsupportedOperationException(); }
    default int insertItem(ActorHandle actor, UUID controller, Point point, String item, int count) { throw new UnsupportedOperationException(); }
    default String extractItem(ActorHandle actor, UUID controller, Point point, int slot, int count) { throw new UnsupportedOperationException(); }
    default String dropItem(ActorHandle actor, Point point, String item, int count, String data) { throw new UnsupportedOperationException(); }
    default int giveItem(ActorHandle target, String item, int count) { throw new UnsupportedOperationException(); }
    default boolean explode(ActorHandle actor, Point point, double power, String data) { throw new UnsupportedOperationException(); }
    default boolean lightning(ActorHandle actor, UUID controller, Point point, boolean visualOnly) { throw new UnsupportedOperationException(); }
    default boolean ignite(ActorHandle target, int ticks) { throw new UnsupportedOperationException(); }
    default boolean target(ActorHandle actor, ActorHandle target) { throw new UnsupportedOperationException(); }
    default boolean weather(ActorHandle actor, String weather, int ticks) { throw new UnsupportedOperationException(); }
    /** Raw native objects for content: the entity behind an actor, the level, a block state or block entity, nearby entities of any kind. */
    default Object nativeEntity(ActorHandle target) { return null; }
    default Object nativeLevel(ActorHandle source) { return null; }
    default Object nativeBlock(ActorHandle source, Point point, boolean entity) { return null; }
    default Object[] nativeEntities(ActorHandle source, Point centre, double radius, String type) { return new Object[0]; }
    default Object spawnEntity(ActorHandle actor, UUID controller, String type, Point point, String nbt, int ticks) { throw new UnsupportedOperationException(); }
    default int command(ActorHandle actor, UUID controller, String command) { throw new UnsupportedOperationException(); }
    default void removeHelper(ActorHandle actor, ActorHandle helper) { throw new UnsupportedOperationException(); }
    default ActorHandle helperSource(ActorHandle actor) { return null; }
    default String helperData(ActorHandle actor) { return "{}"; }
    default void effectChanged(ActorHandle actor) {}
    default void effectChanged(ActorHandle actor, String definition) { effectChanged(actor); }
    default boolean clear(ActorHandle source, Point from, Point to) { throw new UnsupportedOperationException(); }
    default void sound(ActorHandle source, String sound, Point point, double radius, String data) { throw new UnsupportedOperationException(); }
    default SoundObservation[] heard(ActorHandle source, long after, double radius) { return new SoundObservation[0]; }
    default void checkThread() {}
    default String controlIdentity(ActorHandle actor) { return actor.key(); }
    default ActorHandle findActor(String domain, UUID identity) { return null; }
}
