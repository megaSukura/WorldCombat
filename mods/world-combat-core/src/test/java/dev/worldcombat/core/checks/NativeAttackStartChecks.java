package dev.worldcombat.core.checks;

import com.google.gson.JsonArray;
import com.google.gson.JsonParser;
import dev.worldcombat.core.world.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.projectile.Arrow;
import net.minecraft.world.entity.projectile.SmallFireball;
import net.minecraft.world.entity.projectile.Snowball;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.EntityJoinLevelEvent;
import java.util.ArrayList;
import java.util.function.Consumer;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Real Mob attempts, accepted fresh launches, and native fireball motion against the generic registered law. */
public final class NativeAttackStartChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var source = mob(EntityType.ZOMBIE, level, 2); var target = mob(EntityType.COW, level, 3);
        var actor = combat.bind(source); var observer = combat.bind(target); var cleanup = new ArrayList<Entity>();
        cleanup.add(source); cleanup.add(target);
        Consumer<EntityJoinLevelEvent> refuse = event -> { if (event.getEntity().getTags().contains("checks:refuse_start")) event.setCanceled(true); };
        NeoForge.EVENT_BUS.addListener(refuse);
        try {
            long before = cursor(combat, observer, actor);
            source.doHurtTarget(target);
            var melee = records(combat, observer, actor, before);
            require(melee.size() == 1 && melee.get(0).getAsJsonObject().get("kind").getAsString().equals("contact"), "Base Mob attack start was not observed");
            long seen = cursor(combat, observer, actor);
            require(records(combat, observer, actor, seen).isEmpty(), "Old contact start replayed after its cursor");
            var arrow = new Arrow(EntityType.ARROW, level); cleanup.add(arrow);
            arrow.setOwner(source); arrow.setPos(3, 110, 2); arrow.setDeltaMovement(1.5, 0, 0); arrow.setBaseDamage(3);
            require(level.addFreshEntity(arrow), "Arrow fixture failed");
            var shot = records(combat, observer, actor, seen);
            require(shot.size() == 1 && shot.get(0).getAsJsonObject().get("baseDamage").getAsDouble() == 5, "Launch base was not sampled from actual arrow velocity/baseDamage");
            require(shot.get(0).getAsJsonObject().get("waterDrag").getAsDouble() == (double) .6f, "Arrow water retention was replaced by Throwable defaults");
            seen = cursor(combat, observer, actor);
            var loaded = new Arrow(EntityType.ARROW, level); cleanup.add(loaded);
            loaded.setOwner(source); loaded.setPos(3, 110, 3); loaded.setDeltaMovement(1, 0, 0);
            require(level.addWithUUID(loaded), "Saved-identity insertion fixture failed");
            require(records(combat, observer, actor, seen).isEmpty(), "Non-fresh insertion became a new start");
            var denied = new Arrow(EntityType.ARROW, level); cleanup.add(denied);
            denied.setOwner(source); denied.setDeltaMovement(1,0,0); denied.addTag("checks:refuse_start");
            require(!level.addFreshEntity(denied) && records(combat, observer, actor, seen).isEmpty(), "Rejected launch became a start");
            var unknown = new Snowball(EntityType.SNOWBALL, level); cleanup.add(unknown);
            unknown.setOwner(source); unknown.setPos(3,110,5); unknown.setDeltaMovement(1,0,0); level.addFreshEntity(unknown);
            require(records(combat, observer, actor, seen).isEmpty(), "Unregistered projectile acquired a guessed attack description");
            var fire = new SmallFireball(EntityType.SMALL_FIREBALL, level); cleanup.add(fire);
            fire.setOwner(source); fire.setPos(3,110,8); fire.setDeltaMovement(.1,0,0); level.addFreshEntity(fire);
            var fireStart = records(combat, observer, actor, seen);
            require(fireStart.size() == 1 && fireStart.get(0).getAsJsonObject().get("acceleration").getAsDouble() == fire.accelerationPower, "Fireball launch acceleration lost");
            var copy = new CombatProjectile(CombatWorldContent.PROJECTILE.get(), level); cleanup.add(copy);
            copy.configure(combat, 0, source, new Vec3(3,110,10), new Vec3(.1,0,0), 0, .1, 20, 100,
                hit -> {}, () -> {}, "{\"acceleration\":0.1,\"drag\":0.95,\"waterDrag\":0.8}");
            level.addFreshEntity(copy);
            for (int i=0; i<5; i++) {
                level.tickNonPassenger(fire); level.tickNonPassenger(copy);
                require(Math.abs(fire.getX()-copy.getX())<1e-6 && fire.getDeltaMovement().distanceTo(copy.getDeltaMovement())<1e-6,
                    "Generic acceleration/drag diverged from actual fireball flight");
            }
            mark("Native attack starts verified: real contact, cursor isolation, fresh/failed/unknown insertion, launch budget and native fireball acceleration/drag");
        } finally { NeoForge.EVENT_BUS.unregister(refuse); cleanup.forEach(Entity::discard); }
    }
    private static long cursor(MinecraftCombat combat, dev.worldcombat.core.runtime.ActorHandle observer, dev.worldcombat.core.runtime.ActorHandle actor) {
        return JsonParser.parseString(combat.attackStarts(observer, actor, 0)).getAsJsonObject().get("cursor").getAsLong();
    }
    private static JsonArray records(MinecraftCombat combat, dev.worldcombat.core.runtime.ActorHandle observer, dev.worldcombat.core.runtime.ActorHandle actor, long after) {
        return JsonParser.parseString(combat.attackStarts(observer, actor, after)).getAsJsonObject().getAsJsonArray("records");
    }
}
