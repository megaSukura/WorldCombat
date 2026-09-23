package dev.worldcombat.core.world;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;

/** Native provenance shared by every living damage domain. */
public final class NativeDamageFacts {
    private NativeDamageFacts() {}
    public static void add(JsonObject data, DamageSource cause, Entity victim, String sourceActor) {
        var source = cause.getEntity(); var direct = cause.getDirectEntity();
        data.addProperty("damageType", cause.typeHolder().unwrapKey().map(key -> key.location().toString()).orElse(""));
        var tags = new JsonArray(); cause.typeHolder().tags().map(tag -> tag.location().toString()).sorted().forEach(tags::add);
        data.add("damageTags", tags);
        data.addProperty("sourceActor", sourceActor);
        data.addProperty("sourceEntity", source == null ? "" : source.getStringUUID());
        data.addProperty("directEntity", direct == null ? "" : direct.getStringUUID());
        data.addProperty("sourceType", type(source)); data.addProperty("directType", type(direct));
        data.addProperty("sourceLiving", source instanceof LivingEntity);
        data.addProperty("direct", source != null && source != victim && direct == source);
        data.addProperty("bypassesInvulnerability", cause.is(net.minecraft.tags.DamageTypeTags.BYPASSES_INVULNERABILITY));
    }
    private static String type(Entity entity) {
        return entity == null ? "" : BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType()).toString();
    }
}
