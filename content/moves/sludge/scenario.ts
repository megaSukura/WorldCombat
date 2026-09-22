/**
 * 污泥攻击 / sludge —— 可执行设计说明。
 *
 * 一句话：从脚边抓一团湿泥低弧甩向对手，便宜、出手快，糊中后可能中毒、泥团在身上摊开。
 *
 * 场面：一只臭臭泥带着这一招，站在 6 格外对一只小拉达：距离在投掷距离内，AI 会直接丢。
 * 小拉达用撞击还手，逼出「反复丢、把毒累上去」的场面。
 *
 * 断言只取必然事实：这招被放过、目标挨到过伤害。中毒（原生 30% 的随机掷）、暴击与落点写进 note。
 */
Smoke.scenario("sludge", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "muk", level: 40, moves: ["sludge"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("sludge", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("sludge", caster) >= 1, "muk committed sludge");
        stage.expect(stage.damageTo(target) > 0, "the sludge glob dealt damage");
        stage.note("the poison roll, crits and where a missed glob lands are random", {
            casts: stage.casts("sludge", caster),
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hadMobEffect(target, "world_combat:status/poison"),
            targetAlive: target.alive()
        });
        stage.done();
    }, "a sludge glob lands within 60 s");
});
