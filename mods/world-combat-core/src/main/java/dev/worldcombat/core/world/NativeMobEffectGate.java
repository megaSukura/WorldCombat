package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.ExecutionOrigin;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.effect.MobEffectInstance;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import java.util.Locale;

/** Native application attempt and exact caller provenance; content may only add a refusal. */
public final class NativeMobEffectGate {
    public static final String TOPIC = "world_combat:mob_effect_incoming";
    private NativeMobEffectGate() {}
    private record Attempt(LivingEntity recipient, MobEffectInstance effect, Entity source, ExecutionOrigin origin) {}
    private static final ThreadLocal<Attempt> applying = new ThreadLocal<>();
    /** Attribution belongs only to this exact native application; nested raw Mod calls retain their own provenance. */
    public static boolean add(LivingEntity recipient, MobEffectInstance effect, Entity source, ExecutionOrigin origin) {
        return scoped(recipient,effect,source,origin,() -> recipient.addEffect(effect,source));
    }
    public static boolean permits(LivingEntity recipient, MobEffectInstance effect, Entity source, ExecutionOrigin origin) {
        return scoped(recipient,effect,source,origin,() -> net.neoforged.neoforge.common.CommonHooks.canMobEffectBeApplied(recipient,effect,source));
    }
    private static boolean scoped(LivingEntity recipient, MobEffectInstance effect, Entity source, ExecutionOrigin origin, java.util.function.BooleanSupplier operation) {
        var previous = applying.get(); applying.set(new Attempt(recipient, effect, source, origin));
        try { return operation.getAsBoolean(); }
        finally { if (previous == null) applying.remove(); else applying.set(previous); }
    }

    public static void apply(MobEffectEvent.Applicable event) {
        var recipient = event.getEntity();
        if (event.getResult() == MobEffectEvent.Applicable.Result.DO_NOT_APPLY
            || !(recipient.level() instanceof ServerLevel level) || !CombatServices.CONTENT.ready()
            || !CombatServices.CONTENT.hooks().has(TOPIC) || !CombatServices.domain(recipient).available(recipient)) return;
        var combat = CombatServices.get(level.getServer());
        var source = event.getEffectSource();
        var sourceActor = source instanceof LivingEntity living && living.level() == recipient.level()
            && living.distanceToSqr(recipient) <= 64 * 64 && CombatServices.domain(living).available(living)
            ? combat.bind(living) : null;
        var target = combat.bind(recipient);
        var effect = event.getEffectInstance();
        var data = new JsonObject();
        data.addProperty("id", BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString());
        data.addProperty("category", effect.getEffect().value().getCategory().name().toLowerCase(Locale.ROOT));
        var tags = new JsonArray(); effect.getEffect().tags().map(tag -> tag.location().toString()).sorted().forEach(tags::add);
        data.add("tags", tags);
        data.addProperty("duration", effect.getDuration()); data.addProperty("amplifier", effect.getAmplifier());
        data.addProperty("ambient", effect.isAmbient()); data.addProperty("visible", effect.isVisible());
        data.addProperty("showIcon", effect.showIcon());
        data.addProperty("nativeResult", event.getResult().name().toLowerCase(Locale.ROOT));
        data.addProperty("sourceActor", sourceActor == null ? "" : sourceActor.ref());
        data.addProperty("sourceEntity", source == null ? "" : source.getStringUUID());
        data.addProperty("sourceType", source == null ? "" : BuiltInRegistries.ENTITY_TYPE.getKey(source.getType()).toString());
        data.addProperty("sourceLiving", source instanceof LivingEntity);
        var position = new JsonArray();
        if (source != null) { position.add(source.getX()); position.add(source.getY()); position.add(source.getZ()); }
        data.add("sourcePosition", source == null ? JsonNull.INSTANCE : position);
        var attempt = applying.get();
        var origin = attempt != null && attempt.recipient == recipient && attempt.effect == effect && attempt.source == source
            && sourceActor != null && attempt.origin != null && attempt.origin.belongsTo(sourceActor) ? attempt.origin : null;
        ExecutionOrigin.stamp(data, origin);
        var result = combat.runtime().event(TOPIC, sourceActor == null ? target : sourceActor, target, data.toString(), true, origin);
        if (!result.rejection().isEmpty()) event.setResult(MobEffectEvent.Applicable.Result.DO_NOT_APPLY);
    }

    public static void install(IEventBus bus) { bus.addListener(EventPriority.LOWEST, NativeMobEffectGate::apply); }
}
