package dev.worldcombat.core.world;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;

/** Confirmed native store changes. NeoForge Remove/Added remain preflight events, not commit facts. */
public final class NativeEffectFacts {
    private NativeEffectFacts() {}
    public static void added(LivingEntity entity, MobEffectInstance installed, MobEffectInstance previous) {
        if (entity.level() instanceof ServerLevel level && entity.getEffect(installed.getEffect()) == installed)
            CombatServices.get(level.getServer()).mobEffectAdded(entity, installed, previous);
    }
    public static void removed(LivingEntity entity, MobEffectInstance previous, String cause) {
        if (previous != null && entity.level() instanceof ServerLevel level && entity.getEffect(previous.getEffect()) != previous)
            CombatServices.get(level.getServer()).mobEffectEnded(entity, previous, cause);
    }
}
