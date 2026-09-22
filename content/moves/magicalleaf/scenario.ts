/**
 * 魔法叶 / magicalleaf —— 可执行设计说明。
 *
 * 一句话：散出一群会拐弯追人的叶，从四面八方收拢，所以打得到。
 *
 * 场面：一只只带魔法叶的罗丝雷朵，对一只五格外的对手。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、对手受过魔法叶伤害。叶数、暴击、命中几片叶、合围角度写进 note 供读轨迹判断。
 */
Smoke.scenario("magicalleaf", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "roserade", level: 40, moves: ["magicalleaf"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("magicalleaf", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("magicalleaf", caster) >= 1, "caster committed magical leaf");
            stage.expect(stage.damageTo(foe) > 0, "magical leaf dealt damage to the foe");
            stage.note("leaf count, how many homing leaves landed, crit, and the envelop ring are positional/random", {
                casts: stage.casts("magicalleaf", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                foeAt: foe.position().map(function (n: number) { return Math.round(n * 10) / 10; })
            });
            stage.done();
        });
    }, "magical leaf lands on a foe within 50 s");
});
