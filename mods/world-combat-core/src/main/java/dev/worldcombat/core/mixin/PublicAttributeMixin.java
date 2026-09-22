package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.PublicAttributes;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(AttributeInstance.class)
public abstract class PublicAttributeMixin {
    @Inject(method = "setDirty", at = @At("TAIL"))
    private void worldcombat$changed(CallbackInfo ci) { PublicAttributes.changed((AttributeInstance) (Object) this); }
}
