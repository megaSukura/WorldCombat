package dev.worldcombat.core.checks;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.common.util.FakePlayer;
import net.neoforged.neoforge.event.entity.living.LivingDamageEvent;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import net.neoforged.neoforge.event.entity.player.CriticalHitEvent;
import net.neoforged.neoforge.event.entity.player.SweepAttackEvent;
import java.util.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Real Player.attack, native event veto/reentrancy and main/sweep adoption. Test-only one-use accounting
 * observes host receipts; the TS budget ledger has its own independent mechanism checks. */
public final class NativePreparedReceiptChecks {
    private static final class Attacker extends FakePlayer {
        Attacker(ServerLevel level) { super(level, new GameProfile(UUID.randomUUID(), "PreparedChecker")); }
        @Override public float getAttackStrengthScale(float partialTick) { return 1; }
        @Override protected float getEnchantedDamage(Entity target, float base, DamageSource cause) { return base + 4; }
        @Override public boolean isInvulnerableTo(DamageSource cause) { return false; }
    }
    private static Attacker player;
    private static LivingEntity target, other;
    private static String mode = "", held = "";
    private static boolean installed, nested, inCall;
    private static int events, commits, rollbacks, claims;
    private static final List<JsonObject> prepares = new ArrayList<>(), damages = new ArrayList<>(), settled = new ArrayList<>();
    private static boolean relevant(WorldEvent event) { return player != null && event.actor().entity().equals(player.getUUID()); }
    public static void onCriticalPrepare(WorldEvent event) {
        if (!relevant(event)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(data.get("prepared").getAsBoolean() && data.get("direct").getAsBoolean() && data.get("sourceLiving").getAsBoolean(), "Prepared critical lost native facts");
        require(event.world().damageReceipt().equals(data.get("receiptId").getAsString()), "Prepared critical has no current receipt");
        prepares.add(data.deepCopy());
        if (!held.isEmpty() || claims == 0) return;
        held = data.get("receiptId").getAsString();
        data.addProperty("fixtureReservation", held);
        data.addProperty("criticalPrepared", true);
        if (!data.get("critical").getAsBoolean()) data.addProperty("multiplier", 1.5);
        data.addProperty("critical", true);
        if (mode.equals("sweep")) data.addProperty("disableSweep", false);
        if (mode.equals("forge")) data.addProperty("receiptId", "fixture:forged");
        event.data(data.toString());
    }
    public static void onDamagePrepare(WorldEvent event) {
        if (!relevant(event)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(event.world().damageReceipt().equals(data.get("receiptId").getAsString()), "Damage prepare has no current receipt");
        damages.add(data.deepCopy());
        if (mode.equals("early-reduction")) { data.addProperty("amount", 8); event.data(data.toString()); }
    }
    public static void onSettled(WorldEvent event) {
        if (!relevant(event)) return;
        require(inCall, "Prepared receipt settled after attack returned");
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        String id = data.get("receiptId").getAsString();
        require(!id.equals(event.world().damageReceipt()), "Settled prepared receipt remained available for reservation");
        settled.add(data);
        if (!id.equals(held)) return;
        require(data.get("fixtureReservation").getAsString().equals(held), "Prepared metadata was lost before settlement");
        held = "";
        if (data.get("actual").getAsDouble() > 0) { commits++; claims--; } else rollbacks++;
    }
    private static void install() {
        if (installed) return;
        installed = true;
        NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, (CriticalHitEvent event) -> {
            if (player == null || event.getEntity() != player) return;
            events++;
            if (mode.equals("veto")) event.setCriticalHit(false);
            if (mode.equals("native-multiplier")) event.setDamageMultiplier(2.25F);
            if (mode.equals("throw-critical")) throw new IllegalStateException("fixture critical failure");
            if (!nested && (mode.equals("nested-hurt") || mode.equals("nested-attack"))) {
                nested = true;
                try {
                    if (mode.equals("nested-attack")) player.attack(other);
                    else other.hurt(player.damageSources().playerAttack(player), 2);
                } finally { nested = false; }
                require(!held.isEmpty(), "Nested call consumed the pending parent reservation");
            }
        });
        NeoForge.EVENT_BUS.addListener((SweepAttackEvent event) -> {
            if (player == null || event.getEntity() != player) return;
            if (mode.equals("sweep")) event.setSweeping(true);
            if (mode.equals("throw-before-hurt")) throw new IllegalStateException("fixture before main hurt");
        });
        NeoForge.EVENT_BUS.addListener(EventPriority.HIGHEST, (LivingIncomingDamageEvent event) -> {
            if (player == null || event.getSource().getEntity() != player) return;
            if (mode.equals("cancel")) event.setCanceled(true);
            if (mode.equals("early-reduction")) {
                require(event.getAmount() == 8, "Damage branch was not selected before the first native incoming listener");
                event.setAmount(Math.min(event.getAmount(), 5));
            }
        });
        NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, (LivingDamageEvent.Pre event) -> {
            if (player != null && event.getSource().getEntity() == player && mode.equals("zero")) event.setNewDamage(0);
        });
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        install();
        target = mob(EntityType.COW, level, 3); other = mob(EntityType.COW, level, 3.3);
        player = new Attacker(level); player.moveTo(2, 100, 2, -90, 0); level.addNewPlayer(player); combat.bind(player);
        player.getAttribute(Attributes.ATTACK_DAMAGE).setBaseValue(10);
        for (var body : List.of(target, other)) { body.getAttribute(Attributes.MAX_HEALTH).setBaseValue(100); combat.bind(body); }
        try {
            for (String scenario : List.of("force", "natural", "native-multiplier", "forge", "veto", "cancel", "zero", "absorb", "invulnerable", "nested-hurt", "nested-attack", "sweep", "throw-critical", "throw-before-hurt", "early-reduction")) {
                mode = scenario; held = ""; events = commits = rollbacks = 0; claims = 1; nested = false;
                prepares.clear(); damages.clear(); settled.clear();
                player.moveTo(2, 100, 2, -90, 0); player.setOnGround(!scenario.equals("natural")); player.fallDistance = scenario.equals("natural") ? 1 : 0;
                target.moveTo(3, 100, 2, 0, 0); other.moveTo(3.3, 100, 2, 0, 0);
                for (var body : List.of(target, other)) {
                    body.setHealth(100); body.invulnerableTime = 0; body.setInvulnerable(scenario.equals("invulnerable"));
                    body.getAttribute(Attributes.MAX_ABSORPTION).setBaseValue(100);
                    body.setAbsorptionAmount(scenario.equals("absorb") ? 100 : 0);
                }
                boolean threw = false; inCall = true;
                try { player.attack(target); } catch (IllegalStateException expected) { threw = true; }
                finally { inCall = false; }
                require(held.isEmpty() && combat.damageReceipt().isEmpty(), "Prepared scope/reservation leaked in " + scenario);
                require(events == (scenario.equals("nested-attack") ? 2 : 1), "Native critical event replayed or was skipped in " + scenario);
                require(prepares.size() == (scenario.equals("nested-attack") ? 2 : 1), "Prepared hook count mismatch in " + scenario);
                String id = prepares.getFirst().get("receiptId").getAsString();
                var matches = settled.stream().filter(row -> row.get("receiptId").getAsString().equals(id)).toList();
                require(matches.size() == 1, "Prepared attempt did not finish exactly once: " + scenario + " " + settled);
                var result = matches.getFirst();
                boolean failure = Set.of("veto", "cancel", "zero", "absorb", "invulnerable", "throw-critical", "throw-before-hurt").contains(scenario);
                require(commits == (failure ? 0 : 1) && rollbacks == (failure ? 1 : 0), "One-use settlement mismatch in " + scenario);
                require(threw == scenario.startsWith("throw-"), "Unexpected exception result in " + scenario);
                double expected = failure ? 0 : scenario.equals("native-multiplier") ? 26.5 : scenario.equals("early-reduction") ? 5 : 19;
                require(Math.abs(result.get("actual").getAsDouble() - expected) < 1e-5, "Base/enchantment or failure accounting mismatch in " + scenario + ": " + result);
                if (!failure) {
                    require(result.get("nativeCriticalPrepared").getAsBoolean() && result.get("critical").getAsBoolean(), "Main hurt lost the final native critical decision");
                    require(damages.stream().filter(row -> row.get("receiptId").getAsString().equals(id)).count() == 1, "Main hurt did not adopt exactly once");
                }
                if (scenario.equals("veto")) {
                    require(result.get("rejection").getAsString().equals("critical-denied"), "Native veto was not an immediate failed attempt");
                    require(Math.abs(target.getHealth() - 86) < 1e-5, "Veto changed ordinary base plus enchantment damage");
                    require(damages.stream().noneMatch(row -> row.get("receiptId").getAsString().equals(id)), "Ordinary hurt adopted a denied critical receipt");
                }
                if (scenario.equals("nested-hurt") || scenario.equals("nested-attack") || scenario.equals("sweep")) {
                    require(other.getHealth() < 100, "Secondary native hit did not run in " + scenario);
                    require(damages.stream().anyMatch(row -> !row.get("receiptId").getAsString().equals(id)), "Secondary hit reused main receipt in " + scenario);
                    require(damages.stream().filter(row -> !row.get("receiptId").getAsString().equals(id)).noneMatch(row -> row.has("fixtureReservation")), "Secondary hit inherited main reservation metadata");
                }
                if (scenario.equals("natural")) require(prepares.getFirst().get("vanillaCritical").getAsBoolean(), "Natural critical fixture did not exercise its intended path");
            }
            mode = "owner-chain"; held = ""; damages.clear(); settled.clear(); player.setHealth(20); player.invulnerableTime = 0;
            // FakePlayer.tick is intentionally empty; its fresh ServerPlayer spawn guard otherwise returns
            // before delegating to Player/LivingEntity, independently of LivingEntity.invulnerableTime.
            try {
                var spawnGuard=net.minecraft.server.level.ServerPlayer.class.getDeclaredField("spawnInvulnerableTime");
                spawnGuard.setAccessible(true);spawnGuard.setInt(player,0);
            } catch(ReflectiveOperationException failure) { throw new AssertionError("Cannot prepare native player delegation fixture",failure); }
            inCall = true;
            try { player.hurt(level.damageSources().magic(), 3); } finally { inCall = false; }
            require(damages.size() == 1 && settled.size() == 1,
                "ServerPlayer/Player/Living owner count: prepare="+damages.size()+", settled="+settled.size()+", rows="+settled);
            require(Math.abs(player.getHealth()-17)<1e-5,"Player delegation fixture lost expected HP: "+player.getHealth()+", rows="+settled);
            mark("Native prepared receipts verified: single native critical event, veto/no-hurt/failure release, natural consumption, enchantment arithmetic, nested/sweep separation and pre-native amount selection");
        } finally { inCall = nested = false; mode = held = ""; var oldPlayer = player; player = null; oldPlayer.discard(); target.discard(); other.discard(); target = other = null; }
    }
}
