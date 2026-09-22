package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.reactive.ObservableSubscription;
import com.cobblemon.mod.common.battles.BagItems;
import dev.worldcombat.cobblemon.LegacyBattleGate;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(value = ObservableSubscription.class, remap = false)
public abstract class PrewarmSubscriptionMixin {
    @Shadow @Final private Function1<Object, Unit> handler;

    @Inject(method = "handle", at = @At("HEAD"), cancellable = true)
    private void worldcombat$skipPrewarm(Object value, CallbackInfo callback) {
        // In the pinned 1.8.0 release this is Cobblemon's sole BagItems observer.
        // Intercept its invocation to keep other data observers and the common/client
        // branches in Cobblemon's main class untouched by frame recomputation.
        if (value instanceof BagItems
                && handler.getClass().getNestHost().getName().equals("com.cobblemon.mod.common.Cobblemon")) {
            LegacyBattleGate.skipPrewarm();
            callback.cancel();
        }
    }
}
