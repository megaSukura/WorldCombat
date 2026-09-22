package dev.worldcombat.core.world;

import java.util.UUID;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;

public interface CombatDomain {
    default void committed(LivingEntity actor, dev.worldcombat.core.runtime.ActionContext action) {}
    String id();
    boolean supports(LivingEntity entity);
    UUID identity(LivingEntity entity);
    default String controlIdentity(LivingEntity entity) { return ""; }
    default boolean available(LivingEntity entity) { return entity.isAlive() && !entity.isRemoved(); }
    default boolean mayControl(LivingEntity entity, ServerPlayer controller) { return true; }
    default boolean friendly(LivingEntity source, LivingEntity target) { return source.isAlliedTo(target); }
    default void movementControl(LivingEntity entity, boolean controlled) {}
    default void joined(LivingEntity entity) {}
    /** Public facts other combatants may read about this entity (status, ownership, species...), added to survey records. */
    default void facts(LivingEntity entity, com.google.gson.JsonObject out) {}
    default void healed(LivingEntity entity) {}
    default boolean deferredDamage() { return false; }
    default void defeated(LivingEntity source, LivingEntity target, ServerPlayer controller) {}
    /** The player this entity belongs to, when the domain knows one. */
    default UUID owner(LivingEntity entity) { return entity instanceof net.minecraft.world.entity.OwnableEntity ownable ? ownable.getOwnerUUID() : null; }
}
