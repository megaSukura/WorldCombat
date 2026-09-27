package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.DamageRelations;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Per-invocation relation permission leaves native defenses and later independent calls intact. */
public final class NativeDamageRelationsChecks {
    private static final class Player extends net.neoforged.neoforge.common.util.FakePlayer {
        Player(ServerLevel level) { super(level, new com.mojang.authlib.GameProfile(UUID.randomUUID(), "RelationCheck")); }
        @Override public boolean isInvulnerableTo(net.minecraft.world.damagesource.DamageSource source) { return false; }
    }
    private static boolean installed, cancel, probe;
    private static UUID recipient;
    private static MinecraftCombat nestedCombat;
    private static dev.worldcombat.core.runtime.ActorHandle nestedSource, nestedTarget;
    public static void run(MinecraftCombat combat, ServerLevel level) {
        if (!installed) {
            installed = true;
            NeoForge.EVENT_BUS.addListener((LivingIncomingDamageEvent event) -> {
                if (!event.getEntity().getUUID().equals(recipient)) return;
                if (probe) {
                    probe = false;
                    require(!nestedCombat.damage(nestedSource, nestedTarget, null, 1, "{}"), "Relation permission leaked into nested ordinary hurt");
                }
                if (cancel) event.setCanceled(true);
            });
        }
        var source = mob(EntityType.COW, level, 2); var target = mob(EntityType.COW, level, 6);
        var a = combat.bind(source); var b = combat.bind(target);
        var board = level.getScoreboard(); var team = board.addPlayerTeam("damage-relations");
        board.addPlayerToTeam(source.getScoreboardName(), team); board.addPlayerToTeam(target.getScoreboardName(), team);
        var allies = DamageRelations.parse("{\"friendly\":true}"); var self = DamageRelations.parse("{\"self\":true}");
        recipient = target.getUUID(); nestedCombat = combat; nestedSource = a; nestedTarget = b;
        try {
            require(combat.friendly(a, b), "Relation fixture is not allied");
            require(!combat.damage(a, b, null, 3, "{}"), "Ordinary hurt admitted a friend");
            require(!combat.damage(a, a, null, 3, "{}"), "Ordinary hurt admitted itself");
            require(!combat.damage(a, a, null, 3, "{}", null, allies), "Friendly permission also admitted self");
            require(!combat.damage(a, b, null, 3, "{}", null, self), "Self permission also admitted friends");
            probe = true; float before = target.getHealth();
            require(combat.damage(a, b, null, 3, "{}", null, allies) && target.getHealth() < before,
                "Explicit friend hurt failed the native path");
            target.invulnerableTime = 0; cancel = true; before = target.getHealth();
            require(!combat.damage(a, b, null, 3, "{}", null, allies) && target.getHealth() == before,
                "Explicit friend permission bypassed native cancellation");
            cancel = false; target.setInvulnerable(true);
            require(!combat.damage(a, b, null, 3, "{}", null, allies), "Relation permission bypassed invulnerability");
            target.setInvulnerable(false); target.invulnerableTime = 0;
            target.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.MAX_ABSORPTION).setBaseValue(8);
            target.setAbsorptionAmount(8); before = target.getHealth();
            require(target.getAbsorptionAmount() == 8, "Absorption fixture has no native absorption capacity");
            combat.damage(a, b, null, 3, "{}", null, allies);
            require(target.getHealth() == before && target.getAbsorptionAmount() < 8, "Relation permission bypassed absorption");
            source.invulnerableTime = 0; before = source.getHealth();
            require(combat.damage(a, a, null, 3, "{}", null, self) && source.getHealth() < before, "Explicit self hurt was rejected");
            require(!combat.damage(a, b, null, 3, "{}"), "Relation permission leaked into next hurt");
            boolean invalid = false; try { DamageRelations.parse("{\"friendly\":\"true\"}"); } catch (RuntimeException expected) { invalid = true; }
            require(invalid, "Relation permission accepted a string boolean");
            mark("Native damage relations verified: independent self/friend permissions, cancellation, absorption, invulnerability and nested/later isolation");
        } finally {
            recipient = null; nestedCombat = null; nestedSource = nestedTarget = null; cancel = probe = false;
            board.removePlayerTeam(team); source.discard(); target.discard();
        }
        var attacker = new Player(level); var defender = new Player(level);
        attacker.setPos(2, 5, 2); defender.setPos(3, 5, 2);
        var party = board.addPlayerTeam("relation-players"); party.setAllowFriendlyFire(false);
        board.addPlayerToTeam(attacker.getScoreboardName(), party); board.addPlayerToTeam(defender.getScoreboardName(), party);
        try {
            var spawnGuard = net.minecraft.server.level.ServerPlayer.class.getDeclaredField("spawnInvulnerableTime");
            spawnGuard.setAccessible(true); spawnGuard.setInt(defender, 0);
            var from = combat.bind(attacker); var to = combat.bind(defender);
            require(!combat.damage(from, to, null, 3, "{}", null, allies), "Explicit relations bypassed native PvP/team protection");
            defender.setGameMode(net.minecraft.world.level.GameType.CREATIVE);
            require(!combat.damage(from, to, null, 3, "{}", null, allies), "Explicit relations admitted a creative player");
            defender.setGameMode(net.minecraft.world.level.GameType.SPECTATOR);
            require(!combat.damage(from, to, null, 3, "{}", null, allies), "Explicit relations admitted a spectator");
            mark("Explicit damage relations retain native player PvP/team and creative/spectator protection");
        } catch (ReflectiveOperationException failure) { throw new AssertionError(failure); }
        finally { board.removePlayerTeam(party); attacker.discard(); defender.discard(); }
    }
}
