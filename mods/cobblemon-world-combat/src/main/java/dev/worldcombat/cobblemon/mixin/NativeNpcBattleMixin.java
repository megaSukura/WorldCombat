package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.battles.model.PokemonBattle;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Managed NPC handles retain native queries and callbacks while their lifecycle belongs to the world host. */
@Mixin(value = PokemonBattle.class, remap = false)
public abstract class NativeNpcBattleMixin {
    @Inject(method = "stop", at = @At("HEAD"), cancellable = true)
    private void worldcombat$stop(CallbackInfo callback) {
        if (NativeNpcChallenges.endNative((PokemonBattle) (Object) this, "native-stop")) callback.cancel();
    }

    @Inject(method = "end", at = @At("HEAD"), cancellable = true)
    private void worldcombat$end(CallbackInfo callback) {
        if (NativeNpcChallenges.endNative((PokemonBattle) (Object) this, "native-end")) callback.cancel();
    }

    @Inject(method = {"tick", "writeShowdownAction"}, at = @At("HEAD"), cancellable = true)
    private void worldcombat$isolate(CallbackInfo callback) {
        if (NativeNpcChallenges.managed((PokemonBattle) (Object) this)) callback.cancel();
    }
}
