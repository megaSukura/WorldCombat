/**
 * 喷火 / eruption 的可执行设计说明。
 *
 * 场面：一只满血、只会喷火的精灵，面对 3 格外的一只铁傀儡（血量足够挨下一记而不至于被一击带走）。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（喷发命中）。
 * 是否点着僵尸、一次喷到几个，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("eruption", function (stage) {
    var caster = stage.pokemon({ species: "Camerupt", level: 40, moves: ["eruption"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("eruption") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("eruption") > 0, "eruption was committed");
        stage.expect(stage.damageTo(foe) > 0, "the eruption dealt damage");
        stage.note("eruption observations", { casts: stage.casts("eruption"), onFoe: stage.damageTo(foe),
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            casterHealth: Math.round(caster.health() * 10) / 10 });
        stage.done();
    }, "eruption lands");
});
