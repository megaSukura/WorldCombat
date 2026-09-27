package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.render.pokemon.PokemonRenderer;
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import com.mojang.blaze3d.vertex.PoseStack;
import dev.worldcombat.core.client.NativeEntityEcho;
import net.minecraft.client.renderer.MultiBufferSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Keep Pokemon appearance, layers and shown items while excluding live-world auxiliary render operations. */
@Mixin(value=PokemonRenderer.class,remap=false)
abstract class PokemonEntityEchoMixin {
    @Inject(method="shouldRenderLabel",at=@At("HEAD"),cancellable=true)
    private void worldcombat$echoLabel(CallbackInfoReturnable<Boolean> callback){if(NativeEntityEcho.active())callback.setReturnValue(false);}
    @Inject(method="renderTransition",at=@At("HEAD"),cancellable=true)
    private void worldcombat$echoTransition(CallbackInfo callback){if(NativeEntityEcho.active())callback.cancel();}
    @WrapOperation(method="render(Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;FFLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;I)V",
        at=@At(value="INVOKE",target="Lcom/cobblemon/mod/common/client/render/pokemon/AlphaEyeRendererKt;doAlphaEyeRendering(Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;FLcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;)V"))
    private void worldcombat$echoTrail(PokemonEntity entity,float partial,PoseStack pose,MultiBufferSource buffers,Operation<Void> original){
        if(!NativeEntityEcho.active())original.call(entity,partial,pose,buffers);
    }
}
