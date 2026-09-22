/**
 * 浊雾 / smog —— 可执行设计说明。
 *
 * 一句话：吸一口气，朝正前方喷出一道低矮的浊雾锥，雾贴着地面向前滚，扫到的人吃一点伤害并很容易中毒。
 *
 * 场面：一只双弹瓦斯带着这一招，站在 4 格外对一只小拉达喷雾：距离在喷吐距离内，AI 会直接出手。
 * 小拉达用撞击还手，逼出「反复熏、把毒累上去」的场面。
 *
 * 断言只取必然事实：这招被放过、目标挨到过雾的伤害。中毒（原生 40% 的随机掷）、暴击与两段是否都扫到写进 note。
 */
Smoke.scenario("smog", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "weezing", level: 30, moves: ["smog"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("smog", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("smog", caster) >= 1, "weezing committed smog");
        stage.expect(stage.damageTo(target) > 0, "the smog cone dealt damage");
        stage.note("the poison roll, crits and whether both cone segments reached the target are random/positional", {
            casts: stage.casts("smog", caster),
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hadMobEffect(target, "world_combat:status/poison"),
            targetAlive: target.alive()
        });
        stage.done();
    }, "a smog cone lands within 60 s");
});
