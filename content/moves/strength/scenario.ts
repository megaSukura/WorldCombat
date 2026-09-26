/**
 * 怪力 / strength 的可执行设计说明。
 *
 * 场面：会怪力的怪力（Machamp）对一只只会撞击的小敌，隔一点五格开战；小敌背后立一堵石砖墙，
 * 给“身体被这一拳顶到墙上时的撞墙冲击”留出机会。
 * 必然事实：本招被提交过；目标受到过伤害（命中 100，直拳必中）。
 * 是否正好把人顶到墙面、撞墙那一段是否兑现，取决于双方站位与背后是否真的贴墙，写进 note 供读轨迹判断。
 */
Smoke.scenario("strength", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machamp", level: 36, moves: ["strength"], at: [-1.6, 0, 0] });
    var foe = stage.pokemon({ species: "Machop", level: 20, moves: ["tackle"], at: [1.4, 0, 0] });
    stage.fill([3, 0, -1], [3, 2, 1], "minecraft:stone_bricks");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("strength", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("strength", caster) > 0, "strength was committed");
        stage.expect(stage.damageTo(foe) > 0, "the punch dealt damage (accuracy 100, the straight punch connects)");
        stage.note("直拳必中；撞墙冲击只在目标身体真的被顶到背后墙上时兑现，属于站位结果。双方位置与累计伤害如下", {
            casts: stage.casts("strength", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAt: foe.position().map(function (n) { return Math.round(n * 10) / 10; }),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "strength lands on the target");
});
