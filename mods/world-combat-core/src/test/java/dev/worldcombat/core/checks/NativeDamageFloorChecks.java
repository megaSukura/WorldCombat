package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.LivingDamageEvent;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** A late Mod multiplier must not turn a scoped sparing hit into a kill. */
public final class NativeDamageFloorChecks {
    private static boolean installed, amplify;
    private static UUID victim;
    public static void run(MinecraftCombat combat, ServerLevel level) {
        if (!installed) {
            installed = true;
            NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (LivingDamageEvent.Pre event) -> {
                if (amplify && event.getEntity().getUUID().equals(victim)) event.setNewDamage(event.getNewDamage() * 100);
            });
        }
        var from = mob(EntityType.COW, level, 2); var to = mob(EntityType.COW, level, 8);
        victim = to.getUUID(); amplify = true;
        var source = combat.bind(from); var target = combat.bind(to);
        try {
            to.setHealth(8); to.invulnerableTime = 0;
            require(combat.damage(source, target, null, 2, "{\"minimumHealth\":1}"), "Sparing hit was rejected");
            require(to.isAlive() && to.getHealth() == 1, "Late native multiplier bypassed health floor");
            to.setHealth(8); to.invulnerableTime = 0;
            require(combat.health(target, target, null, -2, "checks:share", 1) == -7 && to.getHealth() == 1,
                "Native self-cost did not retain scoped health floor");
            to.setHealth(8); to.invulnerableTime = 0; to.setAbsorptionAmount(3);
            combat.damage(source, target, null, 2, "{\"minimumHealth\":1}");
            require(to.getHealth() >= 1 && to.getHealth() < 8 && to.getAbsorptionAmount() == 0, "Native absorption no longer reduces a sparing hit");
            to.setHealth(8); to.invulnerableTime = 0;
            combat.damage(source, target, null, 2, "{}");
            require(!to.isAlive(), "Floor leaked into a later independent hit");
            mark("Native damage floor verified: late multipliers, scoped self-cost, absorption and independent next hit");
        } finally { victim = null; amplify = false; from.discard(); to.discard(); }
    }
}
