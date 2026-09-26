/** Observe the actual field receipt, rather than counting the cast alone. */
let courtchangeTransferred = false;
WorldCombat.on("world_combat:checks/courtchange", "world_combat:committed", "", event => {
    const action = event.action(); if (!action || action.content() !== "world_combat:courtchange") return;
    const world = event.world(), own = String(event.actor().ref());
    const before = PokemonSkills.courtChangeScan(world, action.targetPosition(), PokemonSkills.p("courtchange", "field", action)).filter(field => !field.friendly);
    const clocks = WorldEffects.areas(world);
    action.after(2, current => {
        const after = WorldEffects.areas(current.sense());
        before.forEach(field => {
            const original = clocks.filter(value => value.id === field.id)[0];
            if (!original || after.some(value => value.id === field.id)) return;
            if (after.some(value => value.source === own && value.rule === original.rule && value.remaining <= original.remaining
                && JSON.stringify(value.position) === JSON.stringify(original.position) && value.radius === original.radius)) courtchangeTransferred = true;
        });
    });
});
Smoke.scenario("courtchange", function (stage) {
    courtchangeTransferred = false;
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowscarada", level: 40, moves: ["courtchange"], at: [-2, 0, 0] });
    var bait = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "sandslash", level: 40, moves: ["spikes"], at: [4, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    // 施法者与穿山王互为敌人：穿山王把菱撒向施法者，撒出的敌方领域就落在施法者脚下；
    // 施法者因此有明确的威胁与一处扫得到的敌方领域，才会选择换场。
    stage.hostile(caster, foe);
    stage.hostile(caster, bait);
    stage.hostile(foe, bait);
    stage.until(2400, function () {
        return courtchangeTransferred;
    }, function () {
        stage.expect(stage.casts("courtchange", caster) > 0, "court change was committed after an enemy field appeared nearby");
        stage.expect(courtchangeTransferred, "the actual field changed source at the same position without refreshing its clock");
        stage.note("换场扫出中心半径内的所有共享领域效果：敌方的过户给施法者、我方的过户给最近的敌人，领域只换主人、规则与剩余时长不变。穿山王撒在施法者身边的尖刺因此转而扎它自己。实际接管／交出几处随穿山王叠了几层而变，是时机结果；换场半径随等级与体型、光点随特攻变化，速换与稳换各有代价。", {
            courtCasts: stage.casts("courtchange", caster),
            spikesCasts: stage.casts("spikes", foe),
            casterAlive: caster.alive(),
            foeAlive: foe.alive(),
            baitAlive: bait.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "court change flips the field");
});
