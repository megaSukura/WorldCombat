/**
 * 复生祈祷 / revivalblessing 的可执行设计说明。
 *
 * 场面：只会复生祈祷的沙奈朵（Gardevoir，55 级）；同队一只被围在小坑里、会在日光下自燃的僵尸（原版生物）当「会倒下的伙伴」。
 * 必然事实：队友受到伤害并倒下（`damageTo` > 0 且不再存活）；本招被提交过（`stage.casts`）；
 *   施法者获得慈爱祝福（共享身份 `world_combat:status/revival_blessing`）。
 * **真正的「让昏厥的后备宝可梦以半血复活」需要共享入口，本场景只验证祈祷、光柱与祝福（见报告共享前置）。**
 */
Smoke.scenario("revivalblessing", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 55, moves: ["revivalblessing"], at: [-2, 0, 0] });
    var ally = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.team("revive", [caster, ally]);
    // 把伙伴围在一格小坑里，保证它倒下时留在原地、离施法者够近。
    [[0, 0, 0], [2, 0, 0], [1, 0, -1], [1, 0, 1], [0, 1, 0], [2, 1, 0], [1, 1, -1], [1, 1, 1], [1, 2, 0]]
        .forEach(function (cell) { stage.block(cell, "minecraft:stone"); });
    stage.after(5, function () { stage.command("data merge entity @e[type=minecraft:zombie] {NoAI:1b}"); });
    stage.until(900, function () {
        return stage.casts("revivalblessing", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/revival_blessing");
    }, function () {
        stage.expect(stage.damageTo(ally) > 0, "the teammate took a hit");
        stage.expect(!ally.alive(), "the teammate fell");
        stage.expect(stage.casts("revivalblessing", caster) > 0, "revival blessing was committed after a teammate fell");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/revival_blessing"), "the caster carries the loving blessing identity");
        stage.note("祈祷范围随等级、光柱停留随等级、祝福时长随亲密度；记下的倒下记录会被这次祈祷消耗。真正的复活（半血复活后备个体）需要共享的复活／入场入口，本单元标为待前置。", {
            casts: stage.casts("revivalblessing", caster),
            allyAlive: ally.alive(),
            damageToAlly: Math.round(stage.damageTo(ally) * 10) / 10,
            blessed: stage.hadMobEffect(caster, "world_combat:status/revival_blessing"),
            casterAlive: caster.alive()
        });
        stage.done();
    }, "revival blessing is prayed over a fallen teammate");
});
