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
    private record Revision(MobEffectInstance instance, long value) {}
    private static final java.util.Map<LivingEntity, java.util.Map<net.minecraft.world.effect.MobEffect, Revision>> revisions = new java.util.WeakHashMap<>();
    private static long nextRevision;
    /** Added fires even when native merging keeps an identical state. Each application retires old ownership. */
    public static void applied(LivingEntity entity, MobEffectInstance requested) {
        var current = entity.getEffect(requested.getEffect());
        revisions.computeIfAbsent(entity, key -> new java.util.HashMap<>()).put(requested.getEffect().value(),
            new Revision(current == null ? requested : current, ++nextRevision));
    }
    private static long revision(LivingEntity entity, MobEffectInstance effect) {
        var values = revisions.computeIfAbsent(entity, key -> new java.util.HashMap<>());
        var value = values.get(effect.getEffect().value());
        // forceAddEffect and loaded effects can replace the native object without an Added event.
        if (value == null || value.instance() != effect) {
            value = new Revision(effect, ++nextRevision); values.put(effect.getEffect().value(), value);
        }
        return value.value();
    }
    public static MobEffectObservation capture(LivingEntity entity, MobEffectInstance effect) {
        var json = MobEffectInstance.CODEC.encodeStart(JsonOps.INSTANCE, effect).getOrThrow();
        absoluteDuration(json, entity.level().getGameTime());
        var tags = effect.getEffect().tags().map(tag -> tag.location().toString()).sorted().collect(java.util.stream.Collectors.joining(" "));
        return new MobEffectObservation(BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString(),
            effect.getDuration(), effect.getAmplifier(), revision(entity, effect) + ":" + json, tags,
            effect.getEffect().value().getCategory().name().toLowerCase(java.util.Locale.ROOT));
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
