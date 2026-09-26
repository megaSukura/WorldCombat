package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** The native decision remains authoritative; no post-hit division guesses enchantment contributions. */
public final class NativeCriticalChecks {
    private static UUID subject;
    private static String mode;
    public static void onCritical(WorldEvent event) {
        if (subject == null || event.target() == null || !event.target().entity().equals(subject)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        if (mode.equals("reject")) event.reject("checks:critical-ward");
        else if (mode.equals("modify")) {
            require(data.get("vanillaCritical").getAsBoolean() && data.get("vanillaMultiplier").getAsDouble() == 1.5,
                "Critical bridge lost original native facts");
            data.addProperty("multiplier", 2.25); data.addProperty("disableSweep", false); event.data(data.toString());
        }
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2);
        var player = FakePlayerFactory.get(level, new com.mojang.authlib.GameProfile(UUID.randomUUID(), "CriticalChecker"));
        player.moveTo(body.position()); level.addNewPlayer(player); combat.bind(player);
        subject = body.getUUID();
        try {
            mode = "modify";
            var modified = CommonHooks.fireCriticalHit(player, body, true, 1.5F);
            require(modified.isCriticalHit() && modified.getDamageMultiplier() == 2.25F && !modified.disableSweep(),
                "Native critical multiplier/sweep decision did not accept script result");
            mode = "reject";
            var rejected = CommonHooks.fireCriticalHit(player, body, true, 2.25F);
            require(!rejected.isCriticalHit() && rejected.getDamageMultiplier() == 2.25F,
                "Critical refusal changed damage multiplier instead of native decision");
            mode = "preserve";
            require(!CommonHooks.fireCriticalHit(player, body, false, 1).isCriticalHit(), "Ordinary attack became critical");
            mark("Native critical verified: native original facts, multiplier, sweep and critical-only refusal");
        } finally { subject = null; body.discard(); player.discard(); }
    }
}
