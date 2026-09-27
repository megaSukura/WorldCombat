package dev.worldcombat.cobblemon;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.google.gson.JsonParser;
import dev.worldcombat.core.world.CombatServices;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;

/** Server script policy, carried by native entity data for the locally driven riding controllers. */
public final class NativeRidingSpeed {
    public static final String TOPIC = "cobblemon_world_combat:riding_speed";

    /** Both values are relative to the native controller's own species/boost settings. */
    public interface Access {
        float worldcombat$ridingPolicy();
        float worldcombat$ridingFactor();
        void worldcombat$ridingFactors(float policy, float factor);
    }

    private NativeRidingSpeed() {}

    public static void refresh(PokemonEntity entity) {
        if (!(entity.level() instanceof ServerLevel level)) return;
        var access = (Access) entity;
        if (!entity.isAlive() || !(entity.getControllingPassenger() instanceof Player) || !CombatServices.CONTENT.ready()) {
            access.worldcombat$ridingFactors(1F, 1F);
            return;
        }
        var combat = CombatServices.get(level.getServer());
        var actor = combat.bind(entity);
        // Riding seats can outlive the usable combat representation during beams, native busy locks and recall.
        // Availability is the domain's existing contract, including level ownership and current native state.
        if (!combat.valid(actor)) {
            access.worldcombat$ridingFactors(1F, 1F);
            return;
        }
        // The established chain also includes shared roots, immobilization and move-owned constraints.
        // `mode` lets an extension distinguish a ridden controller without duplicating every movement rule.
        var result = combat.runtime().event("world_combat:navigate", actor, null, "{\"speed\":1,\"mode\":\"riding\"}", false);
        if (result.rejection().isEmpty()) result = combat.runtime().event(TOPIC, actor, null, result.data(), false);
        double policy = result.rejection().isEmpty() ? JsonParser.parseString(result.data()).getAsJsonObject().get("speed").getAsDouble() : 0D;
        var movement = entity.getAttribute(Attributes.MOVEMENT_SPEED);
        double physical = movement == null ? 1D : movement.getValue() <= 0D ? 0D
            : movement.getBaseValue() > 0D ? movement.getValue() / movement.getBaseValue() : 1D;
        access.worldcombat$ridingFactors(finiteFactor(policy), finiteFactor(policy * physical));
    }

    private static float finiteFactor(double value) {
        if (!Double.isFinite(value) || value < 0 || value > Float.MAX_VALUE) throw new IllegalArgumentException("Invalid riding speed factor");
        return (float) value;
    }

    public static double policy(PokemonEntity entity) { return ((Access) entity).worldcombat$ridingPolicy(); }
    public static double factor(PokemonEntity entity) { return ((Access) entity).worldcombat$ridingFactor(); }
}
