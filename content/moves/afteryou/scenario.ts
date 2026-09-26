/** Engineering observer checks the actual managed preparation clock; include focuspunch as a smoke dependency. */
let afteryouPreparationAdvanced = 0;
WorldCombat.on("world_combat:checks/afteryou_prepare", "world_combat:committed", "", event => {
    const action = event.action(), target = event.target();
    if (!action || action.content() !== "world_combat:afteryou" || !target) return;
    const before = LivingActions.preparing(event.world(), target);
    if (!before.length) return;
    action.after(1, current => {
        const after = LivingActions.preparing(current.sense(), target);
        before.forEach(previous => after.forEach(next => {
            if (previous.instance === next.instance) afteryouPreparationAdvanced = Math.max(afteryouPreparationAdvanced, previous.total - next.total);
        }));
    });
});
Smoke.scenario("afteryou", function (stage) {
    afteryouPreparationAdvanced = 0;
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone"); stage.weather("clear"); stage.time("day");
    const caster = stage.pokemon({ species: "eevee", level: 32, moves: ["afteryou"], at: [-2, 0, 0] });
    const ally = stage.pokemon({ species: "machamp", level: 30, moves: ["focuspunch"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    const threat = stage.mob({ type: "minecraft:cow", at: [3, 0, 3] });
    stage.noai(foe, threat); stage.team("lead", [caster, ally]); stage.hostile(ally, foe); stage.hostile(caster, threat);
    stage.until(1200, () => afteryouPreparationAdvanced > 0 && stage.casts("focuspunch", ally) > 0, () => {
        stage.expect(stage.casts("afteryou", caster) > 0, "the helper paid for its transfer");
        stage.expect(afteryouPreparationAdvanced > 0, "the recipient's declared preparation was actually shortened");
        stage.expect(stage.attribute(ally, "world_combat:skill_haste") === 0, "the transfer did not become a persistent recipient cooldown buff");
        stage.expect((stage.pp(ally, "focuspunch") || 0) < 20, "the advanced action still paid its original move resource");
        stage.note("actual preparation advance", { ticks: afteryouPreparationAdvanced, helper: stage.casts("afteryou", caster), receiver: stage.casts("focuspunch", ally) });
        stage.done();
    }, "advance a real preparation once");
});
