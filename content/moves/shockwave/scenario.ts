/**
 * 电击波 / shockwave —— 可执行设计说明。
 *
 * 一句话：一记贴地疾行的电击，比反应更快，必定命中。
 *
 * 场面：一只只会电击波的精灵，对一位五格外的对手；场地铺平，白天晴天（不靠湿身加成也能验证基础直击）。
 * 断言只取必然事实：这招被提交过、对手受过电击波伤害。湿身加成、暴击等写进 note 供读轨迹判断。
 */
Smoke.scenario("shockwave", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["shockwave"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
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
