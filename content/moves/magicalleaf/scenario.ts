/**
 * 魔法叶 / magicalleaf —— 可执行设计说明。
 *
 * 一句话：一片接一片发出会拐弯的叶，每片按发出那一刻的准线锁定第一个合法可见敌人。
 *
 * 场面：一只只带魔法叶的罗丝雷朵，对一只五格外的对手。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、对手受过魔法叶伤害。叶数、每片是否锁到、命中几片、暴击写进 note 供读轨迹判断。
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
            stage.note("leaf count, how many leaves locked and landed, crit, and how many leaves the single foe took are positional/random; the foe is the only legal target along the aim", {
                casts: stage.casts("magicalleaf", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                hitsOnFoe: stage.hits(foe, true),
                foeAlive: foe.alive(),
                foeAt: foe.position().map(function (n: number) { return Math.round(n * 10) / 10; })
            });
            stage.done();
        });
    }, "magical leaf lands on a foe within 50 s");
});
