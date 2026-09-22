package dev.worldcombat.core.world;

import com.google.gson.JsonElement;
import com.mojang.serialization.JsonOps;
import dev.worldcombat.core.runtime.MobEffectObservation;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;

/** Vanilla serialization retains hidden effect stacks and NeoForge cure metadata. */
public final class MinecraftEffectState {
    private MinecraftEffectState() {}
    public static MobEffectObservation capture(LivingEntity entity, MobEffectInstance effect) {
        var json = MobEffectInstance.CODEC.encodeStart(JsonOps.INSTANCE, effect).getOrThrow();
        absoluteDuration(json, entity.level().getGameTime());
        var tags = effect.getEffect().tags().map(tag -> tag.location().toString()).sorted().collect(java.util.stream.Collectors.joining(" "));
        return new MobEffectObservation(BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString(),
            effect.getDuration(), effect.getAmplifier(), json.toString(), tags);
    }
    private static void absoluteDuration(JsonElement value, long tick) {
        if (value.isJsonObject()) {
            var object = value.getAsJsonObject();
            if (object.has("duration") && object.get("duration").getAsInt() >= 0)
                object.addProperty("duration", tick + object.get("duration").getAsLong());
            for (var entry : object.entrySet()) absoluteDuration(entry.getValue(), tick);
        } else if (value.isJsonArray()) for (var element : value.getAsJsonArray()) absoluteDuration(element, tick);
    }
}
