/**
 * 浊雾 / smog —— 可执行设计说明。
 *
 * 一句话：吸一口气，朝选定方向吐出一团缓慢滚远、渐渐膨大的浊雾；雾团罩到的人吃一次伤害并很容易中毒，
 *   真实墙会把雾路截在墙前。
 *
 * 场面：一只双弹瓦斯带着这一招，站在 4 格外对一只小拉达吐雾：距离在喷吐距离内，AI 会直接出手。
 * 小拉达用撞击还手，逼出「雾滚到身上再反复熏」的场面。
 *
 * 断言只取必然事实：这招被放过、目标挨到过雾的伤害。中毒（原生 40% 的随机掷）、暴击、雾滚到之前
 * 目标是否横移躲开、以及碰墙截断都是位置或随机结果，写进 note 供读轨迹判断。
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
        stage.expect(stage.damageTo(target) > 0, "the rolling smog cloud coated the target");
        stage.note("the poison roll, crits, whether the target moved out of the path before the front arrived and wall truncation are positional/random", {
            casts: stage.casts("smog", caster),
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hadMobEffect(target, "world_combat:status/poison"),
            targetAlive: target.alive()
        });
        stage.done();
    }, "a rolling smog cloud lands within 60 s");
});
