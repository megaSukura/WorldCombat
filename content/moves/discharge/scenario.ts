/**
 * 放电 / discharge —— 可执行设计说明。
 *
 * 一句话：让电从身上同时迸开，身周一圈的敌人一起挨一次电，被电到的可能麻痹；全形态只放一次。
 *
 * 场面：带电的三合一磁怪带这一招，站在两只小敌中间；小敌用撞击还手，逼出被围住时一次电一圈的场面。
 * 只留一发 PP：断言除「放过、至少一只小敌挨到伤害」外，还检查每人最多只挨一次（旧二段余电会让同一目标收到两次）。
 * 麻痹是否触发（每发约 22% 的随机掷）写进 note。
 */
Smoke.scenario("discharge", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magneton", level: 40, moves: ["discharge"], at: [0, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.5, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.8, 0, 1.0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.setPp(caster, "discharge", 1);
    stage.until(1200, function () {
        return stage.casts("discharge", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("discharge", caster) >= 1, "magneton committed discharge");
            stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the electric ring dealt damage");
            stage.expect(stage.hits(first, true) <= 1 && stage.hits(second, true) <= 1,
                "one simultaneous discharge settles each target at most once (no hidden second scan)");
            stage.note("crit and the paralysis roll are random; each target in the sphere is struck and rolled once", {
                casts: stage.casts("discharge", caster),
                firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
                secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
                firstHits: stage.hits(first, true),
                secondHits: stage.hits(second, true),
                anyParalysed: stage.hadMobEffect(first, "world_combat:status/paralysis") || stage.hadMobEffect(second, "world_combat:status/paralysis"),
                firstAlive: first.alive()
            });
            stage.done();
        });
    }, "discharge zaps a foe within 60 s");
});
