/** Actual enemy/ally mirror collisions and gains-only AI eligibility. Native veto/hidden-stack cases are shared host checks. */
Smoke.scenario("topsyturvy", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 22], "minecraft:stone");
    const caster = stage.pokemon({ species: "malamar", level: 40, moves: ["topsyturvy"], at: [-5, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    const helper = stage.pokemon({ species: "malamar", level: 40, moves: ["topsyturvy"], at: [-5, 0, 16] });
    const ally = stage.mob({ type: "minecraft:cow", at: [0, 0, 16] });
    const pressure = stage.mob({ type: "minecraft:husk", at: [3, 0, 19] });
    stage.hostile(caster, foe); stage.team("mirror", [helper, ally]); stage.noai(foe, ally, pressure);
    stage.command("effect give " + foe.ref.split("/")[0] + " minecraft:speed 200 2 true");
    stage.command("effect give " + ally.ref.split("/")[0] + " minecraft:slowness 200 1 true");
    stage.after(4, function () { stage.prefer(helper, "topsyturvy", { gain: true }); });
    stage.after(8, function () { stage.hostile(helper, pressure); });
    let gainsChecked = false;
    stage.after(40, function () {
        stage.expect(stage.casts("topsyturvy", helper) === 0, "gains-only AI does not cast on a debuffed ally");
        gainsChecked = true;
        stage.prefer(helper, "topsyturvy", { gain: false });
    });
    stage.until(700, function () {
        return gainsChecked && stage.hasMobEffect(foe, "minecraft:slowness") && !stage.hasMobEffect(foe, "minecraft:speed")
            && stage.hasMobEffect(ally, "minecraft:speed") && !stage.hasMobEffect(ally, "minecraft:slowness");
    }, function () {
        stage.expect(stage.casts("topsyturvy", caster) > 0, "enemy reversal committed through the real projectile");
        stage.expect(stage.casts("topsyturvy", helper) > 0, "explicit ally targeting lets the real mirror shard reach its friend");
        stage.expect(stage.damageBy(caster) === 0 && stage.damageBy(helper) === 0, "the reversal retains its non-damaging role");
        stage.note("Both actual collisions reversed the recognised potion pair. The selected friend enables ally collision; full reversal still flips both signs. Particle directions/counts use observed stage changes and committed potion receipts; native immunity, preflight veto, hidden stacks and natural clocks are separately covered by NativeEffectTransformChecks.");
        stage.done();
    }, "both mirror deliveries reverse their original potion");
});
