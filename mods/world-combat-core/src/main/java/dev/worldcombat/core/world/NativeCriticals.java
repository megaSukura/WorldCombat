package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.event.entity.player.CriticalHitEvent;

/** Exposes the native critical decision before Player.attack computes its damage. */
public final class NativeCriticals {
    private NativeCriticals() {}
    public static void apply(CriticalHitEvent event) {
        if (!(event.getEntity().level() instanceof ServerLevel level) || !(event.getTarget() instanceof LivingEntity target)
            || target.level() != level || !CombatServices.CONTENT.ready() || !CombatServices.CONTENT.hooks().has("world_combat:critical_hit")
            || !CombatServices.domain(target).available(target) || !CombatServices.domain(event.getEntity()).available(event.getEntity())) return;
        var combat = CombatServices.get(level.getServer());
        var data = new JsonObject();
        data.addProperty("critical", event.isCriticalHit());
        data.addProperty("multiplier", (double) event.getDamageMultiplier());
        data.addProperty("vanillaCritical", event.isVanillaCritical());
        data.addProperty("vanillaMultiplier", (double) event.getVanillaMultiplier());
        data.addProperty("disableSweep", event.disableSweep());
        var result = combat.runtime().event("world_combat:critical_hit", combat.bind(event.getEntity()), combat.bind(target), data.toString(), true);
        if (!result.rejection().isEmpty()) { event.setCriticalHit(false); return; }
        var updated = JsonParser.parseString(result.data()).getAsJsonObject();
        double multiplier = updated.get("multiplier").getAsDouble();
        if (!Double.isFinite(multiplier) || multiplier < 0 || multiplier > Float.MAX_VALUE) return;
        event.setDamageMultiplier((float) multiplier);
        event.setCriticalHit(updated.get("critical").getAsBoolean());
        event.setDisableSweep(updated.get("disableSweep").getAsBoolean());
    }
}
