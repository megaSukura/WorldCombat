package dev.worldcombat.core.mixin;

import dev.worldcombat.core.client.NativeEntityEcho;
import net.minecraft.client.renderer.entity.EntityRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** EntityRenderer's base render adds labels/leashes after subclass models. Echoes draw only their appearance. */
@Mixin(EntityRenderer.class)
abstract class NativeEntityEchoMixin {
    @Inject(method="render",at=@At("HEAD"),cancellable=true)
    private void worldcombat$echoAttachments(CallbackInfo callback){if(NativeEntityEcho.active())callback.cancel();}
}
