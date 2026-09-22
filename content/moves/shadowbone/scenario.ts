/**
 * 暗影之骨 / shadowbone —— 可执行设计说明。
 *
 * 一句话：在远处掷出一根带灵魂的骨棒，命中时结算不接触伤害，并有机会把目标慑得防御下降。
 *
 * 场面：一只只会暗影之骨的嘎啦嘎啦（45 级）对一只只会跃起的铁掌力士（60 级，只挨打不还手），起手隔 6 格，
 * 便于读出它会远程出手。断言只取必然事实：这招被提交过、目标受到过伤害。慑防是概率结果，写进 note。
 */
Smoke.scenario("shadowbone", function (stage) {
    stage.fill([-10, -1, -7], [10, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "marowak", level: 45, moves: ["shadowbone"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("shadowbone", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("shadowbone", caster) >= 1, "caster committed shadow bone");
        stage.expect(stage.damageTo(foe) > 0, "shadow bone dealt damage to the foe");
        stage.note("the rattle is a 20% roll; the mark tag records whether it landed at all", {
            casts: stage.casts("shadowbone", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            spooked: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "shadow bone lands within 80 s");
});
