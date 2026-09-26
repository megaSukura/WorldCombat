package dev.worldcombat.core.mixin;

import net.minecraft.world.effect.MobEffectInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(MobEffectInstance.class)
public interface NativeEffectStackAccess {
    @Accessor("hiddenEffect") MobEffectInstance worldcombat$hidden();
    @Accessor("hiddenEffect") void worldcombat$hidden(MobEffectInstance value);
}
