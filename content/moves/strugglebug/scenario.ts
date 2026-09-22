/**
 * 虫之抵抗 / strugglebug —— 可执行设计说明。
 *
 * 一句话：施法者原地扎稳，把一圈贴地的虫群从脚下推出去，扫到的敌人一起掉特攻并被虫群缠住。
 *
 * 场面：一只只会虫之抵抗的溜溜糖球（32 级）站在中间，两只弱小的凯西（18 级）从两侧围上来。只给这一招，
 * AI 就只会用它。断言只取必然事实：招式被提交过、至少一个目标受过伤害、至少一个目标被缠住（虫群必缠）。
 * 扫到几个人、缠多久这类位置/对象结果写进 note。
 */
Smoke.scenario("strugglebug", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "surskit", level: 32, moves: ["strugglebug"], at: [0, 0, 0] });
    var left = stage.pokemon({ species: "abra", level: 18, moves: ["tackle"], at: [2, 0, 1] });
    var right = stage.pokemon({ species: "abra", level: 18, moves: ["tackle"], at: [-1, 0, 2] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.until(700, function () {
        return stage.casts("strugglebug", caster) > 0
            && (stage.hadMobEffect(left, "world_combat:status/infested") || stage.hadMobEffect(right, "world_combat:status/infested"));
    }, function () {
        stage.expect(stage.casts("strugglebug", caster) > 0, "虫之抵抗被放出来了");
        stage.expect(stage.damageTo(left) + stage.damageTo(right) > 0, "虫群扫到了至少一个目标");
        stage.expect(stage.hadMobEffect(left, "world_combat:status/infested") || stage.hadMobEffect(right, "world_combat:status/infested"),
            "被扫到的目标缠上了 world_combat:status/infested");
        stage.note("虫群前缘逐刻扩开，扫到几个人、各自掉多少血、缠多久都取决于站位与对象，只作记录；同一目标只被扫到一次。",
            { casts: stage.casts("strugglebug", caster),
                leftDamage: Math.round(stage.damageTo(left) * 10) / 10,
                rightDamage: Math.round(stage.damageTo(right) * 10) / 10,
                leftTravelled: Math.round(stage.travelled(left) * 10) / 10 });
        stage.done();
    }, "虫群扫到目标");
});
