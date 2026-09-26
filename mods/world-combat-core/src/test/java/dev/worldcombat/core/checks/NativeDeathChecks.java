package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.ActionInactiveException;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import java.util.UUID;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Death requests are not death facts; the corpse remains an observation, never a writable actor. */
public final class NativeDeathChecks {
    private static UUID observer, victim;
    private static int facts;
    private static String lastId;
    public static void onDeath(WorldEvent event) {
        if (observer == null || !event.actor().entity().equals(observer) || event.target() == null || !event.target().entity().equals(victim)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(data.get("friendly").getAsBoolean() && data.get("entity").getAsString().equals(victim.toString()), "Death lost observer-relative friendship/identity");
        require(!event.world().valid(event.target()) && event.world().valid(event.actor()), "Death scope gained a live corpse capability");
        boolean blocked = false;
        try { event.world().hurt(event.target(), 1, "{}"); } catch (ActionInactiveException expected) { blocked = true; }
        require(blocked, "Dead receipt granted mutation authority");
        String id = data.get("deathId").getAsString();
        require(!id.equals(lastId), "A confirmed new lifecycle reused the death id");
        lastId = id; facts++;
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var watching = mob(EntityType.COW, level, 2); var dying = mob(EntityType.COW, level, 4);
        var team = level.getScoreboard().addPlayerTeam("death-check-" + watching.getId());
        level.getScoreboard().addPlayerToTeam(watching.getStringUUID(), team);
        level.getScoreboard().addPlayerToTeam(dying.getStringUUID(), team);
        observer = watching.getUUID(); victim = dying.getUUID(); facts = 0; lastId = "";
        combat.bind(watching); combat.bind(dying);
        try {
            var liveRequest = new LivingDeathEvent(dying, level.damageSources().generic());
            combat.deaths().enqueue(liveRequest); combat.deaths().flush();
            require(facts == 0, "An unfulfilled death request was reported");
            var canceled = new LivingDeathEvent(dying, level.damageSources().generic());
            combat.deaths().enqueue(canceled); canceled.setCanceled(true); dying.setHealth(0); combat.deaths().flush();
            require(facts == 0, "A later native cancellation was reported as death");
            dying.setHealth(10); combat.deaths().flush();
            require(dying.hurt(level.damageSources().generic(), 1000), "Native death fixture did not take damage");
            combat.deaths().flush(); require(facts == 1, "Final native death did not reach the living observer");
            combat.deaths().enqueue(new LivingDeathEvent(dying, level.damageSources().generic())); combat.deaths().flush();
            require(facts == 1, "Repeated native death delivery was not deduplicated");
            dying.setHealth(10); combat.deaths().flush();
            require(dying.isAlive(), "Native health revival did not reopen the life cycle");
            dying.setHealth(0); combat.deaths().enqueue(new LivingDeathEvent(dying, level.damageSources().generic())); combat.deaths().flush();
            require(facts == 2, "Same-object revival retained its previous death cycle");
            mark("Native death verified: final state, late cancellation, observer-owned facts, duplicate suppression, revival and dead mutation rejection");
        } finally {
            observer = null; victim = null; watching.discard(); dying.discard(); level.getScoreboard().removePlayerTeam(team);
        }
    }
}
