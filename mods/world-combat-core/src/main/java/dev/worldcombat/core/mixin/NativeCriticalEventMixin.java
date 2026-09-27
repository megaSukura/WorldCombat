package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import dev.worldcombat.core.world.NativeCriticals;
import dev.worldcombat.core.world.NativePreparedReceipts;
import net.neoforged.bus.api.Event;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.event.entity.player.CriticalHitEvent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

@Mixin(value = CommonHooks.class, remap = false)
abstract class NativeCriticalEventMixin {
    @WrapOperation(method = "fireCriticalHit", at = @At(value = "INVOKE", target = "Lnet/neoforged/bus/api/IEventBus;post(Lnet/neoforged/bus/api/Event;)Lnet/neoforged/bus/api/Event;"))
    private static Event worldcombat$critical(IEventBus bus, Event event, Operation<Event> original) {
        var critical = (CriticalHitEvent) event;
        NativePreparedReceipts.prepare(critical);
        NativeCriticals.apply(critical);
        var result = original.call(bus, event);
        NativePreparedReceipts.decided((CriticalHitEvent) result);
        return result;
    }
}
