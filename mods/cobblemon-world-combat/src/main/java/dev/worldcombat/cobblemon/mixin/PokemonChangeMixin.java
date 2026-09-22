package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.net.messages.client.PokemonUpdatePacket;
import com.cobblemon.mod.common.pokemon.Pokemon;
import dev.worldcombat.cobblemon.script.NativeChanges;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Every Pokemon property setter reports through `onChange`; that single point feeds `world_combat:actor_changed`. */
@Mixin(value = Pokemon.class, remap = false)
public abstract class PokemonChangeMixin {
    @Inject(method = "onChange", at = @At("HEAD"))
    private void worldcombat$changed(PokemonUpdatePacket<?> packet, CallbackInfo info) {
        NativeChanges.changed((Pokemon) (Object) this);
    }
}
