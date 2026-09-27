package dev.worldcombat.core.checks;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.LivingDamageEvent;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import java.util.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Real native call boundaries, including identical DamageSource reentrancy. No move semantics. */
public final class NativeDamageReceiptChecks {
    private static UUID victim;
    private static String mode = "";
    private static boolean installed, nested, inCall;
    private static final List<JsonObject> incoming = new ArrayList<>(), settled = new ArrayList<>(), applied = new ArrayList<>();
    public static void onIncoming(WorldEvent event) {
        if (victim == null || event.target() == null || !event.target().entity().equals(victim)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(event.world().damageReceipt().equals(data.get("receiptId").getAsString()), "Incoming lost its current native identity");
        incoming.add(data);
        if (mode.equals("script-reject")) event.reject("fixture-refusal");
        if (mode.equals("rewrite-id")) { data.addProperty("receiptId", "fixture:forged"); event.data(data.toString()); }
    }
    public static void onSettled(WorldEvent event) {
        if (victim == null || event.target() == null || !event.target().entity().equals(victim)) return;
        require(inCall, "Receipt was deferred past hurt completion");
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(data.get("settled").getAsBoolean(), "Final receipt not marked settled");
        require(!data.get("receiptId").getAsString().equals(event.world().damageReceipt()), "Completed receipt remained open during observers");
        settled.add(data);
    }
    public static void onApplied(WorldEvent event) {
        if (victim == null || event.target() == null || !event.target().entity().equals(victim)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(data.get("actual").getAsDouble() > 0, "Applied callback accepted zero HP loss");
        require(settled.stream().anyMatch(row -> row.get("receiptId").equals(data.get("receiptId"))), "Applied arrived before its final receipt");
        applied.add(data);
    }
    private static void reset(String next) { mode = next; incoming.clear(); settled.clear(); applied.clear(); }
    private static void outcome(String expected, double actual) {
        require(settled.size() == 1, "Expected one receipt: " + settled);
        var data = settled.getFirst();
        require(data.get("outcome").getAsString().equals(expected), "Wrong outcome: " + data);
        require(Math.abs(data.get("actual").getAsDouble() - actual) < 1e-5, "Wrong own HP loss: " + data);
        require(applied.size() == (actual > 0 ? 1 : 0), "Success-only compatibility callback mismatch");
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        if (!installed) {
            installed = true;
            NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (LivingIncomingDamageEvent event) -> {
                if (victim == null || !event.getEntity().getUUID().equals(victim)) return;
                if (mode.equals("cancel") || mode.equals("nested-cancel") && nested) { event.setCanceled(true); return; }
                if (mode.equals("throw")) throw new IllegalStateException("fixture hurt failure");
                if ((mode.equals("nested") || mode.equals("nested-cancel")) && !nested) {
                    nested = true;
                    try { event.getEntity().invulnerableTime = 0; event.getEntity().hurt(event.getSource(), 2); }
                    finally { nested = false; event.getEntity().invulnerableTime = 0; }
                }
            });
            NeoForge.EVENT_BUS.addListener(net.neoforged.bus.api.EventPriority.LOWEST, (LivingDamageEvent.Pre event) -> {
                if (victim != null && event.getEntity().getUUID().equals(victim) && mode.equals("zero")) event.setNewDamage(0);
            });
            NeoForge.EVENT_BUS.addListener((LivingDamageEvent.Post event) -> {
                if (victim == null || !event.getEntity().getUUID().equals(victim) || !mode.equals("post-nested") || nested) return;
                nested = true;
                try { event.getEntity().invulnerableTime = 0; event.getEntity().hurt(event.getSource(), 2); }
                finally { nested = false; }
            });
        }
        var from = mob(EntityType.COW, level, 2); var to = mob(EntityType.COW, level, 8);
        victim = to.getUUID(); combat.bind(from); combat.bind(to);
        var cause = level.damageSources().mobAttack(from);
        try {
            for (String scenario : List.of("normal", "cancel", "zero", "absorb", "script-reject", "invulnerable", "rewrite-id", "nested", "nested-cancel", "post-nested", "throw")) {
                reset(scenario); to.setHealth(10); to.invulnerableTime = 0;
                to.getAttribute(Attributes.MAX_ABSORPTION).setBaseValue(8); to.setAbsorptionAmount(scenario.equals("absorb") ? 8 : 0);
                to.setInvulnerable(scenario.equals("invulnerable"));
                boolean threw = false; inCall = true;
                try { to.hurt(cause, 3); } catch (IllegalStateException expected) { threw = true; }
                finally { inCall = false; }
                require(combat.damageReceipt().isEmpty(), "Native scope leaked after " + scenario);
                if (scenario.equals("throw")) { require(threw, "Exception fixture did not throw"); outcome("error", 0); continue; }
                require(!threw, "Unexpected native exception in " + scenario);
                if (scenario.equals("nested") || scenario.equals("post-nested") || scenario.equals("nested-cancel")) {
                    require(settled.size() == 2 && incoming.size() == 2, "Nested hurt lost a receipt");
                    var child = settled.get(0); var parent = settled.get(1);
                    require(!child.get("receiptId").equals(parent.get("receiptId")), "Same cause/victim reused a receipt identity");
                    require(child.get("originInstance").equals(parent.get("originInstance")), "Receipt identity accidentally replaced delivery provenance");
                    require(Math.abs(parent.get("actual").getAsDouble() - 3) < 1e-5, "Parent counted child HP loss or used cancelled child's container");
                    require(Math.abs(child.get("actual").getAsDouble() - (scenario.equals("nested-cancel") ? 0 : 2)) < 1e-5, "Nested loss mismatch");
                    continue;
                }
                switch (scenario) {
                    case "normal", "rewrite-id" -> outcome("applied", 3);
                    case "cancel" -> outcome("cancelled", 0);
                    case "zero" -> outcome("zero", 0);
                    case "absorb" -> { outcome("absorbed", 0); require(settled.getFirst().get("absorbed").getAsDouble() == 3, "Absorption not retained"); }
                    case "script-reject" -> outcome("rejected", 0);
                    case "invulnerable" -> { outcome("refused", 0); require(incoming.isEmpty(), "Early invulnerability was not early"); }
                }
                if (scenario.equals("rewrite-id")) require(!settled.getFirst().get("receiptId").getAsString().equals("fixture:forged"), "Content replaced the host receipt id");
            }
            reset("normal"); to.setInvulnerable(false); to.setAbsorptionAmount(0); to.setHealth(10); to.invulnerableTime = 0;
            inCall = true; try { to.hurt(cause, 3); } finally { inCall = false; }
            var first = settled.getFirst().get("receiptId").getAsString(); reset("normal");
            inCall = true; try { to.hurt(cause, 2); } finally { inCall = false; }
            outcome("refused", 0); require(!first.equals(settled.getFirst().get("receiptId").getAsString()), "Sequential reuse of DamageSource reused a receipt");
            mark("Native damage receipts verified: unique same-cause nested identity, own HP, synchronous failures/absorption, scope cleanup and applied ordering");
        } finally { victim = null; mode = ""; inCall = nested = false; from.discard(); to.discard(); }
    }
}
