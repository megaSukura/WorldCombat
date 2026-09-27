package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import dev.worldcombat.core.world.NativeDamageReceipts;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;

@Mixin(Player.class)
abstract class NativePlayerDamageReceiptMixin {
    @WrapMethod(method = "hurt")
    private boolean worldcombat$receipt(DamageSource cause, float amount, Operation<Boolean> original) {
        var victim = (Player) (Object) this;
        if (victim.level().isClientSide) return original.call(cause, amount);
        try (var receipt = NativeDamageReceipts.enter(victim, cause, amount, Player.class)) {
            return receipt.returned(original.call(cause, receipt.amount(amount)));
        }
    }
}
