package dev.worldcombat.core.checks;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.Point;
import dev.worldcombat.core.world.MinecraftCombat;
import dev.worldcombat.core.world.NativeDamageFacts;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.projectile.Snowball;
import net.minecraft.world.entity.projectile.ThrownEnderpearl;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.ProjectileImpactEvent;
import net.neoforged.neoforge.event.entity.player.AttackEntityEvent;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Neutral native entities exercise bounded observation, actual segments and protection-aware removal. */
public final class NativeProjectileObservationChecks {
    private static UUID subject;
    private static boolean cancelImpact, cancelAttack, installed;
    public static void run(MinecraftCombat combat, ServerLevel level) {
        if (!installed) {
            installed = true;
            NeoForge.EVENT_BUS.addListener((ProjectileImpactEvent event) -> {
                if (cancelImpact && event.getProjectile().getUUID().equals(subject)) event.setCanceled(true);
            });
            NeoForge.EVENT_BUS.addListener((AttackEntityEvent event) -> {
                if (cancelAttack && event.getTarget().getUUID().equals(subject)) event.setCanceled(true);
            });
        }
        var shooter = mob(EntityType.COW, level, 2); var defender = mob(EntityType.COW, level, 8);
        var projectile = new Snowball(EntityType.SNOWBALL, level);
        var special = new ThrownEnderpearl(EntityType.ENDER_PEARL, level);
        var own = new Snowball(EntityType.SNOWBALL, level); var unowned = new Snowball(EntityType.SNOWBALL, level);
        try {
            projectile.setOwner(shooter); projectile.setPos(3, 101, 2); projectile.setNoGravity(true);
            require(level.addFreshEntity(projectile), "Observation fixture projectile spawn failed");
            var observations = combat.projectileObservations();
            observations.before(projectile); projectile.setPos(5, 101, 3); observations.after(projectile);
            observations.before(projectile); projectile.setPos(6, 101, 2); observations.after(projectile);
            var path = observations.path(projectile);
            require(path.size() == 2 && path.get(0).getAsJsonObject().getAsJsonArray("to").get(2).getAsDouble() == 3,
                "Observed bent flight was replaced by owner-to-victim inference");
            observations.before(projectile); observations.after(projectile);
            require(observations.path(projectile).size() == 2, "Stationary ticks accumulated invented path");
            observations.before(projectile);
            observations.impact(projectile, new EntityHitResult(defender, new Vec3(7.4, 101, 2)));
            var facts = new JsonObject();
            NativeDamageFacts.add(facts, level.damageSources().thrown(projectile, shooter), defender, combat.bind(shooter).ref());
            var legs = facts.getAsJsonArray("projectilePath");
            require(legs.size() == 3 && legs.get(2).getAsJsonObject().getAsJsonArray("to").get(0).getAsDouble() == 7.4,
                "Damage provenance lost its accepted contact endpoint");
            require(legs.get(2).getAsJsonObject().get("tick").getAsLong() == combat.runtime().now()
                && legs.get(2).getAsJsonObject().get("ownerEntity").getAsString().equals(shooter.getStringUUID()), "Flight ownership/clock differs from world facts");
            var visible = JsonParser.parseString(combat.projectiles(combat.bind(defender), new Point(6, 101, 2), 2)).getAsJsonArray();
            require(visible.size() == 1 && visible.get(0).getAsJsonObject().get("hostile").getAsBoolean(), "Native nearby projectile observation failed");
            require(!combat.interceptProjectile(combat.bind(shooter), null, projectile.getUUID()), "Own projectile was intercepted as hostile");
            subject = projectile.getUUID(); cancelAttack = true;
            require(!combat.interceptProjectile(combat.bind(defender), null, subject) && !projectile.isRemoved(), "Attack protection was bypassed");
            cancelAttack = false; cancelImpact = true;
            require(!combat.interceptProjectile(combat.bind(defender), null, subject) && !projectile.isRemoved(), "Impact cancellation was bypassed");
            cancelImpact = false;
            require(combat.interceptProjectile(combat.bind(defender), null, subject) && projectile.isRemoved(), "Supported native interception did not complete removal");
            require(observations.path(projectile).isEmpty(), "Removed projectile retained its trajectory");
            special.setOwner(shooter); special.setPos(5, 101, 2); level.addFreshEntity(special);
            require(!combat.interceptProjectile(combat.bind(defender), null, special.getUUID()) && !special.isRemoved(), "Unsupported special projectile was forcibly removed");
            own.setOwner(defender); own.setPos(6, 101, 2); level.addFreshEntity(own);
            require(!combat.interceptProjectile(combat.bind(defender), null, own.getUUID())
                && combat.interceptProjectile(combat.bind(defender), null, own.getUUID(), true) && own.isRemoved(), "Explicit own-projectile interception did not preserve the safe default");
            unowned.setPos(6, 101, 2); level.addFreshEntity(unowned); subject = unowned.getUUID(); cancelImpact = true;
            require(!combat.interceptProjectile(combat.bind(defender), null, subject, true) && !unowned.isRemoved(), "Non-hostile opt-in bypassed impact protection");
            cancelImpact = false;
            require(!combat.interceptProjectile(combat.bind(defender), null, subject)
                && combat.interceptProjectile(combat.bind(defender), null, subject, true), "Explicit unowned-projectile interception failed");
            mark("Native projectile observations verified: real segments, scoped query, source/clock, protections, supported removal and unsupported refusal");
        } finally {
            subject = null; cancelAttack = false; cancelImpact = false;
            projectile.discard(); special.discard(); own.discard(); unowned.discard(); shooter.discard(); defender.discard();
        }
    }
}
