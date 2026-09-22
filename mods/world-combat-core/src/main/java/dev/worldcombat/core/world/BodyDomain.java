package dev.worldcombat.core.world;

import java.util.UUID;
import net.minecraft.world.entity.LivingEntity;

/** Scripted bodies stay addressable while dying so their brain receives the death and can end cleanly. */
final class BodyDomain implements CombatDomain {
    @Override public String id() { return "world_combat_core:body"; }
    @Override public boolean supports(LivingEntity entity) { return entity instanceof ScriptedBody; }
    @Override public UUID identity(LivingEntity entity) { return entity.getUUID(); }
    @Override public boolean available(LivingEntity entity) { return !entity.isRemoved(); }
    @Override public UUID owner(LivingEntity entity) { return ((ScriptedBody) entity).owner(); }
}