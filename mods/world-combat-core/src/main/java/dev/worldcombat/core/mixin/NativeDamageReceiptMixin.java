package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import dev.worldcombat.core.world.NativeDamageReceipts;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import java.util.Stack;

@Mixin(LivingEntity.class)
abstract class NativeDamageReceiptMixin {
    @Shadow(remap = false) protected Stack<DamageContainer> damageContainers;
    @WrapMethod(method = "hurt")
    private boolean worldcombat$receipt(DamageSource cause, float amount, Operation<Boolean> original) {
        var victim = (LivingEntity) (Object) this;
        if (victim.level().isClientSide) return original.call(cause, amount);
        int depth = damageContainers.size();
        try (var receipt = NativeDamageReceipts.enter(victim, cause, amount, LivingEntity.class)) {
            try { return receipt.returned(original.call(cause, receipt.amount(amount))); }
            finally {
                // NeoForge's incoming-cancel early return leaves its push behind. Restore only this
                // invocation's stack entries, before a receipt observer can perform another hurt.
                while (damageContainers.size() > depth) damageContainers.pop();
            }
        }
    }
}
