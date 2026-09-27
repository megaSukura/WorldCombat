package dev.worldcombat.core.world;

import com.google.gson.JsonElement;
import com.mojang.serialization.JsonOps;
import dev.worldcombat.core.runtime.MobEffectObservation;
import dev.worldcombat.core.mixin.NativeEffectStackAccess;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;

/** Vanilla serialization retains hidden effect stacks and NeoForge cure metadata. */
public final class MinecraftEffectState {
    private MinecraftEffectState() {}
    private record Revision(MobEffectInstance instance, long value) {}
    private static final java.util.Map<LivingEntity, java.util.Map<net.minecraft.world.effect.MobEffect, Revision>> revisions = new java.util.WeakHashMap<>();
    private static long nextRevision;
    /** Called after a confirmed store write/merge. Accepted identical applications also retire old ownership. */
    public static void applied(LivingEntity entity, MobEffectInstance requested) {
        var current = entity.getEffect(requested.getEffect());
        if (current == null) return;
        revisions.computeIfAbsent(entity, key -> new java.util.HashMap<>()).put(requested.getEffect().value(),
            new Revision(current, ++nextRevision));
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
        naturalDuration(json, effect);
        var tags = effect.getEffect().tags().map(tag -> tag.location().toString()).sorted().collect(java.util.stream.Collectors.joining(" "));
        return new MobEffectObservation(BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString(),
            effect.getDuration(), effect.getAmplifier(), revision(entity, effect) + ":" + json, tags,
            effect.getEffect().value().getCategory().name().toLowerCase(java.util.Locale.ROOT));
    }
    public static boolean matches(LivingEntity entity, MobEffectInstance effect, String expected) {
        return effect!=null&&entity.getEffect(effect.getEffect())==effect&&capture(entity,effect).key().equals(expected);
    }
    private static void naturalDuration(JsonElement value, MobEffectInstance effect) {
        var object=value.getAsJsonObject();
        if(object.has("duration")&&effect.getDuration()>=0)
            object.addProperty("duration",object.get("duration").getAsLong()+((NativeEffectClock)effect).worldcombat$naturalTicks());
        var hidden=((NativeEffectStackAccess)effect).worldcombat$hidden();
        if(hidden!=null&&object.has("hidden_effect"))naturalDuration(object.get("hidden_effect"),hidden);
    }
}
