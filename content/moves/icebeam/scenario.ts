// 冰冻光束的可执行设计说明：一只只会冰冻光束的冰系宝可梦沿一条直线打两个前后排着的敌人。
// 必然事实：本招被提交过；至少一个敌人受到过伤害（光束是瞬发贯穿，命中线内目标不会落空）。
// 具体穿到几个、冰冻是否触发（概率）、地面冻出几格冰都写进 note 供读轨迹判断。
Smoke.scenario("icebeam", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "glaceon", level: 40, moves: ["icebeam"], at: [-6, 0, 0] });
    var front = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2, 0, 0] });
    var back = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.until(900, function () {
        return stage.casts("icebeam", caster) >= 1 && stage.damageTo(front) + stage.damageTo(back) > 0;
    }, function () {
        stage.after(28, function () {
            stage.expect(stage.casts("icebeam", caster) >= 1, "glaceon committed ice beam");
            stage.expect(stage.damageTo(front) + stage.damageTo(back) > 0, "the beam dealt damage");
            stage.expect(stage.changedBlocks().length > 0, "the beam froze a line of ice on the ground");
            stage.note("pierce count, the freeze roll and how many ice blocks the rime left are positional/random", {
                casts: stage.casts("icebeam", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                backDamage: Math.round(stage.damageTo(back) * 10) / 10,
                frontFrozen: stage.hadMobEffect(front, "world_combat:status/frozen"),
                changed: stage.changedBlocks().length,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "ice beam lands on a foe within 45 s");
});
