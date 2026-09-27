package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import com.llamalad7.mixinextras.sugar.Local;
import dev.worldcombat.core.world.NativePreparedReceipts;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.neoforged.neoforge.event.entity.player.CriticalHitEvent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

@Mixin(Player.class)
abstract class NativePlayerAttackReceiptMixin {
    @WrapMethod(method = "attack")
    private void worldcombat$attack(Entity target, Operation<Void> original) {
        var player = (Player) (Object) this;
        if (player.level().isClientSide) { original.call(target); return; }
        try (var attempt = NativePreparedReceipts.attack(player, target)) {
            original.call(target); attempt.returned();
        }
    }
    @WrapOperation(method = "attack", at = @At(value = "INVOKE", target = "Lnet/neoforged/neoforge/common/CommonHooks;fireCriticalHit(Lnet/minecraft/world/entity/player/Player;Lnet/minecraft/world/entity/Entity;ZF)Lnet/neoforged/neoforge/event/entity/player/CriticalHitEvent;", remap = false))
    private CriticalHitEvent worldcombat$critical(Player player, Entity target, boolean critical, float multiplier,
        Operation<CriticalHitEvent> original, @Local DamageSource cause) throws Exception {
        try (var call = NativePreparedReceipts.criticalCall(player, target, cause)) {
            return original.call(player, target, critical, multiplier);
        }
    }
    @WrapOperation(method = "attack", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/Entity;hurt(Lnet/minecraft/world/damagesource/DamageSource;F)Z"))
    private boolean worldcombat$mainHurt(Entity target, DamageSource cause, float amount, Operation<Boolean> original) throws Exception {
        try (var call = NativePreparedReceipts.mainHurt(target, cause)) { return original.call(target, cause, amount); }
    }
}
