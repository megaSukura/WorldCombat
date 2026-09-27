package dev.worldcombat.cobblemon.mixin;

import com.bedrockk.molang.runtime.MoParams;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import kotlin.jvm.functions.Function1;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import java.util.Map;

@Mixin(targets = "com.cobblemon.mod.common.api.molang.function.PlayerMoLangFunctions", remap = false)
public abstract class NativeNpcPlayerQueriesMixin {
    @Inject(method = "moLangFunctions(Lnet/minecraft/world/entity/player/Player;)Ljava/util/Map;", at = @At("RETURN"))
    private void worldcombat$queries(Player player, CallbackInfoReturnable<Map<String, Function1<MoParams, Object>>> callback) {
        NativeNpcChallenges.playerFunctions(player, callback.getReturnValue());
    }
}
