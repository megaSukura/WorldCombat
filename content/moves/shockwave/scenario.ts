/**
 * 电击波 / shockwave —— 可执行设计说明。
 *
 * 一句话：一记出手即到的电击；直击沿直线闪到目标，地导沿瞄准方向扫过身前贴地的一条走廊。
 *
 * 场面一（shockwave，直击）：一只只会电击波的精灵，对一位五格外的对手；场地铺平，白天晴天。
 * 场面二（shockwave-ground，地导）：对两位同线站定的对手开启地导，验证走廊能扫到沿线的敌人。
 * 断言只取必然事实：这招被提交过、对手受过电击波伤害。湿身加成、暴击等写进 note 供读轨迹判断。
 */
Smoke.scenario("shockwave", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["shockwave"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(1000, function () {
        return stage.casts("shockwave", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("shockwave", caster) >= 1, "caster committed shock wave");
            stage.expect(stage.damageTo(foe) > 0, "shock wave dealt damage to the foe");
            stage.note("jags, wet bonus and crit are positional/random", {
                casts: stage.casts("shockwave", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAt: foe.position().map(function (n: number) { return Math.round(n * 10) / 10; }),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "shock wave lands on a foe within 50 s");
});

Smoke.scenario("shockwave-ground", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["shockwave"], at: [-4, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.noai(first, second);
    stage.after(5, function () { stage.prefer(caster, "shockwave", { ground: true }); });
    stage.until(1200, function () {
        return stage.casts("shockwave", caster) >= 1 && (stage.damageTo(first) + stage.damageTo(second)) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("shockwave", caster) >= 1, "caster committed the ground sweep");
            stage.expect((stage.damageTo(first) + stage.damageTo(second)) > 0, "the ground sweep hit along its corridor");
            stage.note("how many of two lined-up foes the corridor caught is positional", {
                casts: stage.casts("shockwave", caster),
                first: Math.round(stage.damageTo(first) * 10) / 10,
                second: Math.round(stage.damageTo(second) * 10) / 10
            });
            stage.done();
        });
    }, "ground shock wave lands along the corridor within 60 s");
});
