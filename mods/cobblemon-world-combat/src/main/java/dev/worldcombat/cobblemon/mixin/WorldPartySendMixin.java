package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.CobblemonClient;
import com.cobblemon.mod.common.client.keybind.keybinds.PartySendBinding;
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.cobblemon.mod.common.net.messages.server.SendOutPokemonPacket;
import com.cobblemon.mod.common.pokemon.Pokemon;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** R keeps the native send/recall path even when looking at a wild creature. Riding logic runs before this branch. */
@Mixin(value=PartySendBinding.class,remap=false)
public abstract class WorldPartySendMixin {
    @Inject(method="processEntityTarget",at=@At("HEAD"),cancellable=true)
    private void worldcombat$sendInstead(LocalPlayer player,Pokemon selected,LivingEntity target,CallbackInfo ci){
        if(target instanceof PokemonEntity){
            if(!(player.getVehicle() instanceof PokemonEntity))new SendOutPokemonPacket(CobblemonClient.INSTANCE.getStorage().getSelectedSlot()).sendToServer();
            ci.cancel();
        }
    }
}
