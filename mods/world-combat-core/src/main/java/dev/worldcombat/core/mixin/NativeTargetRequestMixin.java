package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import dev.worldcombat.core.world.NativeTargetRequests;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.neoforged.neoforge.event.entity.living.LivingChangeTargetEvent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

@Mixin(Mob.class)
abstract class NativeTargetRequestMixin {
    @WrapMethod(method = "setTarget")
    private void worldcombat$request(LivingEntity target, Operation<Void> original) {
        NativeTargetRequests.around((Mob) (Object) this, target, wanted -> original.call(wanted));
    }
    @WrapOperation(method = "setTarget", at = @At(value = "INVOKE", target = "Lnet/neoforged/neoforge/common/CommonHooks;onLivingChangeTarget(Lnet/minecraft/world/entity/LivingEntity;Lnet/minecraft/world/entity/LivingEntity;Lnet/neoforged/neoforge/event/entity/living/LivingChangeTargetEvent$ILivingTargetType;)Lnet/neoforged/neoforge/event/entity/living/LivingChangeTargetEvent;"))
    private LivingChangeTargetEvent worldcombat$decision(LivingEntity actor, LivingEntity target,
            LivingChangeTargetEvent.ILivingTargetType type, Operation<LivingChangeTargetEvent> original) {
        var event = original.call(actor, target, type);
        NativeTargetRequests.event((Mob) actor, event);
        return event;
    }
}
