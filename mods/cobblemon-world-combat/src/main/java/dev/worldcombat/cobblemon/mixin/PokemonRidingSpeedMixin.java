package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.riding.RidingStyle;
import com.cobblemon.mod.common.api.riding.stats.RidingStat;
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.cobblemon.NativeRidingSpeed;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(PokemonEntity.class)
public abstract class PokemonRidingSpeedMixin implements NativeRidingSpeed.Access {
    @Unique private static final EntityDataAccessor<Float> worldcombat$ridePolicy = SynchedEntityData.defineId(PokemonEntity.class, EntityDataSerializers.FLOAT);
    @Unique private static final EntityDataAccessor<Float> worldcombat$rideFactor = SynchedEntityData.defineId(PokemonEntity.class, EntityDataSerializers.FLOAT);

    @Inject(method = "defineSynchedData", at = @At("TAIL"))
    private void worldcombat$defineSpeed(SynchedEntityData.Builder builder, CallbackInfo ci) {
        builder.define(worldcombat$ridePolicy, 1F);
        builder.define(worldcombat$rideFactor, 1F);
    }

    @Inject(method = "tick", at = @At("HEAD"))
    private void worldcombat$updateSpeed(CallbackInfo ci) { NativeRidingSpeed.refresh((PokemonEntity) (Object) this); }

    @Inject(method = "getRideStat", at = @At("RETURN"), cancellable = true, remap = false)
    private void worldcombat$nativeRideSpeed(RidingStat stat, RidingStyle style, double minimum, double maximum, CallbackInfoReturnable<Double> result) {
        // SPEED feeds only the controller's propulsion/acceleration. Native jump, gravity, stamina and handling
        // retain their individual settings. Horse walking already reads MOVEMENT_SPEED, handled separately.
        if (stat == RidingStat.SPEED && result.getReturnValue() > 0D)
            result.setReturnValue(Math.max(1e-6, result.getReturnValue() * worldcombat$ridingFactor()));
    }

    @Override public float worldcombat$ridingPolicy() { return ((PokemonEntity) (Object) this).getEntityData().get(worldcombat$ridePolicy); }
    @Override public float worldcombat$ridingFactor() { return ((PokemonEntity) (Object) this).getEntityData().get(worldcombat$rideFactor); }
    @Override public void worldcombat$ridingFactors(float policy, float factor) {
        var data = ((PokemonEntity) (Object) this).getEntityData();
        // SynchedEntityData marks only unequal values dirty, and also supplies a fresh tracking client's baseline.
        data.set(worldcombat$ridePolicy, policy);
        data.set(worldcombat$rideFactor, factor);
    }
}
