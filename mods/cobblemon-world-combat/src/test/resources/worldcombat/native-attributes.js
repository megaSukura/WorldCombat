// Appended only to the isolated server's compiled content, so it uses the shipped mechanism.
var nativeChecks = Java.loadClass("dev.worldcombat.cobblemon.checks.NativeAttributesChecks");
var nativeRulesChecked = false;
CobblemonCombat.register("checks:native-attributes", "fixture", 30, function (action) {
    var attacker = CobblemonCombat.pokemon(action.actor());
    var defender = CobblemonCombat.pokemon(action.target());
    function equal(actual, expected, label) {
        if (Math.abs(actual - expected) > 1e-8) throw new Error(label + ": expected " + expected + ", got " + actual);
    }
    if (!nativeRulesChecked) {
        // Controlled level-50 Machop versus level-70 Snorlax; neutral nature and zero IV/EV.
        equal(PokemonDamage.base(attacker, defender, "normal", "physical", 40), 5, "physical: (4 + 85*.04)/(1 + 96*.005)");
        equal(PokemonDamage.base(attacker, defender, "water", "special", 40), 5.6 / 1.795, "special: (4 + 40*.04)/(1 + 159*.005)");
        equal(PokemonDamage.base(attacker, defender, "fighting", "physical", 40), 15, "STAB and weakness");
        equal(PokemonDamage.base(attacker, defender, "ghost", "special", 40), 0, "immunity");
        equal(PokemonDamage.base(attacker, nativeChecks.dualDefender(), "grass", "special", 40), (5.6 / 1.35) / 4, "dual resistance");
        nativeRulesChecked = true;
    }
    var move = attacker.move(0);
    var damage = PokemonDamage.base(attacker, defender, move.type(), move.category(), move.power());
    action.commit(1);
    var impact = action.trace(action.origin(), action.targetPosition(), 0.1);
    if (!impact.hitEntity()) throw new Error("Native fixture target was not hit");
    var applied = PokemonDamage.hit(action, impact, move, { critical: false });
    var duplicate = PokemonDamage.hit(action, impact, move, { critical: false });
    nativeChecks.record(damage, applied, duplicate);
    action.finish();
});

CobblemonCombat.register("checks:unified-hurt", "fixture", 4, function (action) {
    action.commit(1);
    var move = CobblemonCombat.moveTemplate("tackle"), features = { power: 10000, category: "physical", critical: false };
    var result = PokemonDamage.resolve(action.world(), action.actor(), action.target(), move, features);
    var applied = PokemonDamage.apply(action.world(), action.target(), move, features);
    nativeChecks.recordUnified(result.amount, applied);
    action.finish();
});
CobblemonCombat.register("checks:unified-sleep", "fixture", 4, function (action) {
    action.commit(1);
    if (!CombatStatus.inflict(action.world(), action.target(), "sleep", 45)) throw new Error("Shared sleep rejected fixture");
    action.finish();
});
