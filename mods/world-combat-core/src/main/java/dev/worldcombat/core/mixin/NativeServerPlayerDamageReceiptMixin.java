package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import dev.worldcombat.core.world.NativeDamageReceipts;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;

@Mixin(ServerPlayer.class)
abstract class NativeServerPlayerDamageReceiptMixin {
    @WrapMethod(method = "hurt")
    private boolean worldcombat$receipt(DamageSource cause, float amount, Operation<Boolean> original) {
        var victim = (ServerPlayer) (Object) this;
        try (var receipt = NativeDamageReceipts.enter(victim, cause, amount, ServerPlayer.class)) {
            return receipt.returned(original.call(cause, receipt.amount(amount)));
        }
    }
}
