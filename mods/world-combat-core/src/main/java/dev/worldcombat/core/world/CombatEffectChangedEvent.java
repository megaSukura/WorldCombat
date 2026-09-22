package dev.worldcombat.core.world;

import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.event.entity.EntityEvent;

/** View subscribers can invalidate cached facts when managed effect composition changes. */
public final class CombatEffectChangedEvent extends EntityEvent {
    public CombatEffectChangedEvent(LivingEntity entity) { super(entity); }
}
