package dev.worldcombat.core.world;

import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.event.entity.EntityEvent;

/** Fires for native commands, modifiers and other mods as well as this mod's scripts. */
public final class CombatAttributeChangedEvent extends EntityEvent {
    public CombatAttributeChangedEvent(LivingEntity entity) { super(entity); }
}
