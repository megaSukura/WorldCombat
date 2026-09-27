// Neutral host integration fixture. Production trainer policy and move implementations stay in the supplied profile.
var NativeNpcChallengeChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.NativeNpcChallengeChecks");
WorldCombat.on("checks:npc-damage", "world_combat:damage_applied", "", function (event) {
    NativeNpcChallengeChecks.applied(event);
});
ServerEvents.tick(function (event) { NativeNpcChallengeChecks.tick(event.server); });
