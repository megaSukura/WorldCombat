package dev.worldcombat.core.world;

/** Native equipment changed; interested adapters may invalidate their owner/subject views. */
public final class CombatEquipmentChangedEvent extends net.neoforged.neoforge.event.entity.EntityEvent {
    public CombatEquipmentChangedEvent(net.minecraft.world.entity.LivingEntity entity) { super(entity); }
}
