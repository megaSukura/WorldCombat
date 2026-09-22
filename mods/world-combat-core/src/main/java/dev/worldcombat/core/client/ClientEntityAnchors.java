package dev.worldcombat.core.client;

import com.google.gson.JsonObject;
import java.util.UUID;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.LivingEntity;

/** Read-only entity interpolation usable by native FX frame callbacks outside a drawing callback. */
public final class ClientEntityAnchors {
    private ClientEntityAnchors() {}

    public static String sample(String reference, double partialTicks) {
        var mc = Minecraft.getInstance();
        if (mc == null || mc.level == null || reference == null || !Double.isFinite(partialTicks)) return "null";
        UUID id;
        try { id = UUID.fromString(reference.split("/", 2)[0]); }
        catch (IllegalArgumentException ignored) { return "null"; }
        for (var entity : mc.level.entitiesForRendering()) {
            if (entity.isRemoved() || !entity.getUUID().equals(id)) continue;
            var position = entity.getPosition((float)Math.clamp(partialTicks, 0, 1));
            var data = new JsonObject();
            data.addProperty("x", position.x); data.addProperty("y", position.y); data.addProperty("z", position.z);
            data.addProperty("height", entity.getBbHeight());
            data.addProperty("name", entity.getDisplayName().getString());
            if (entity instanceof LivingEntity living) {
                data.addProperty("health", living.getHealth()); data.addProperty("maxHealth", living.getMaxHealth());
            }
            if (mc.gameRenderer != null)
                data.addProperty("distance", position.distanceTo(mc.gameRenderer.getMainCamera().getPosition()));
            return data.toString();
        }
        return "null";
    }
}
