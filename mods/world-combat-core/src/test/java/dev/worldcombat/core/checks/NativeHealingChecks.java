package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native healing policy boundary; raw state changes are deliberately outside the healing operation. */
public final class NativeHealingChecks {
    private static UUID subject;
    private static String mode = "";
    private static int events;
    public static void onHeal(WorldEvent event) {
        if (subject == null || !event.actor().entity().equals(subject)) return;
        require(event.actor().equals(event.target()), "Healing event fabricated another recipient");
        events++;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        if (mode.equals("half")) {
            require(!data.get("scripted").getAsBoolean() && data.get("healer").getAsString().isEmpty(), "Unknown native healer was invented");
            data.addProperty("amount", data.get("amount").getAsDouble() / 2); event.data(data.toString());
        } else if (mode.equals("reject")) event.reject("checks:heal-blocked");
        else if (mode.equals("script")) {
            require(data.get("scripted").getAsBoolean() && data.get("healer").getAsString().equals(event.actor().ref())
                && data.get("cause").getAsString().equals("checks:restoration"), "Script healing lost actual attribution");
        }
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2); var actor = combat.bind(body);
        subject = body.getUUID(); events = 0;
        try {
            body.setHealth(4); mode = "half"; body.heal(4);
            require(body.getHealth() == 6 && events == 1, "Native healing amount did not pass through the script bridge");
            mode = "reject"; body.heal(4);
            require(body.getHealth() == 6 && events == 2, "Rejected native healing changed HP");
            body.setHealth(3);
            require(body.getHealth() == 3 && events == 2, "Direct state assignment was mistaken for healing");
            mode = "script";
            require(combat.health(actor, actor, null, 2, "checks:restoration") == 2 && body.getHealth() == 5 && events == 3,
                "Script healing did not preserve the native accepted result");
            var cancelled = new net.neoforged.neoforge.event.entity.living.LivingHealEvent(body, 3);
            cancelled.setCanceled(true); combat.healing(cancelled);
            require(events == 3 && cancelled.isCanceled(), "Already-cancelled native healing was revived");
            mark("Native healing verified: native amount, refusal, direct state boundary, attribution and cancellation");
        } finally { mode = ""; subject = null; body.discard(); }
    }
}
