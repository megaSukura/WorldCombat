/**
 * 冰柱坠击 / iciclecrash —— 可执行设计说明。
 *
 * 一句话：在目标头顶凝出一根大冰柱竖直砸下，落点那圈里的敌人被碎冰扫到并可能畏缩。
 *
 * 场面：会冰柱坠击的刺甲贝带这一招，对一只推进中的小敌落下冰柱；小敌用撞击还手。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害。畏缩是否触发（约 26% 的随机掷）、冰柱是否因为目标走位
 * 而落空、地面结出几格冰都写进 note 供读轨迹判断。
 */
Smoke.scenario("iciclecrash", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cloyster", level: 40, moves: ["iciclecrash"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("iciclecrash", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("iciclecrash", caster) >= 1, "cloyster committed iciclecrash");
        stage.expect(stage.damageTo(foe) > 0, "the icicle dealt damage");
        stage.expect(stage.changedBlocks().length === 0, "iciclecrash leaves no ice on the ground");
        stage.note("crit, the flinch roll and whether the target stepped out of the landing are random/positional", {
            casts: stage.casts("iciclecrash", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            changed: stage.changedBlocks().length,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "iciclecrash lands on a foe within 50 s");
});
