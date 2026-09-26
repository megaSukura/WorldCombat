package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.animal.Cow;
import net.minecraft.world.phys.*;
import java.util.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Neutral accepted-contact checks plus actual native movement expiry. */
public final class NativePierceChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) throws Exception {
        var source = mob(EntityType.COW, level, 2);
        var bodies = new ArrayList<Cow>();
        var flights = new ArrayList<CombatProjectile>();
        var impact = CombatProjectile.class.getDeclaredMethod("onHit", HitResult.class);
        var eligible = CombatProjectile.class.getDeclaredMethod("canHitEntity", Entity.class);
        impact.setAccessible(true); eligible.setAccessible(true);
        try {
            for (int i = 0; i < 67; i++) bodies.add(mob(EntityType.COW, level, 12));
            int[] hits = {0}, ended = {0};
            var endless = flight(combat, level, source, "{\"pierce\":true}", 40, 80, hits, ended); flights.add(endless);
            for (var body : bodies) {
                require((boolean) eligible.invoke(endless, body), "New body was prematurely excluded from continuing flight");
                impact.invoke(endless, new EntityHitResult(body, body.position()));
                require(!(boolean) eligible.invoke(endless, body), "Continuing flight can collide with the same entity again");
            }
            require(hits[0] == 67 && !endless.isRemoved() && ended[0] == 0, "Unbounded pierce retained the old 64-entity cutoff");
            impact.invoke(endless, new BlockHitResult(new Vec3(13, 101, 2), Direction.WEST, new BlockPos(13,101,2), false));
            require(endless.isRemoved() && ended[0] == 1, "Continuing pierce passed through a block or completed twice");
            endless.discard(); require(ended[0] == 1, "Removed flight completed twice");

            var numbered = flight(combat, level, source, "{\"pierce\":65}", 40, 80, new int[]{0}, new int[]{0}); flights.add(numbered);
            for (int i = 0; i < 65; i++) impact.invoke(numbered, new EntityHitResult(bodies.get(i), bodies.get(i).position()));
            require(!numbered.isRemoved(), "Explicit pierce count was truncated before its final contact");
            impact.invoke(numbered, new EntityHitResult(bodies.get(65), bodies.get(65).position()));
            require(numbered.isRemoved(), "Explicit pierce count did not stop on the next contact");

            var timed = flight(combat, level, source, "{\"pierce\":true}", 40, 1, new int[]{0}, new int[]{0}); flights.add(timed);
            level.tickNonPassenger(timed); require(timed.isRemoved(), "Continuing pierce ignored native lifetime");
            var ranged = flight(combat, level, source, "{\"pierce\":true}", .5, 80, new int[]{0}, new int[]{0}); flights.add(ranged);
            level.tickNonPassenger(ranged); require(ranged.isRemoved(), "Continuing pierce ignored actual travelled range");
            mark("Native pierce verified: every entity once beyond 64, numeric count, wall stop, lifetime and range");
        } finally { flights.forEach(Entity::discard); bodies.forEach(Entity::discard); source.discard(); }
    }
    private static CombatProjectile flight(MinecraftCombat combat, ServerLevel level, Cow owner, String options,
                                            double range, int lifetime, int[] hits, int[] ended) {
        var projectile = new CombatProjectile(CombatWorldContent.PROJECTILE.get(), level);
        projectile.configure(combat, 0, owner, new Vec3(3,101,2), new Vec3(1,0,0), 0, .1, range, lifetime,
            hit -> hits[0]++, () -> ended[0]++, options);
        require(level.addFreshEntity(projectile), "Pierce fixture projectile spawn failed");
        return projectile;
    }
}
