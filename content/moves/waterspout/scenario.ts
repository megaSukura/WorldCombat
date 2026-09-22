/**
 * 喷水 / waterspout 的可执行设计说明。
 *
 * 场面：一只满血、只会喷水的精灵，面对 3 格外的一只铁傀儡（血量厚，挨完这一击还能活着吃下湿身）。两者开战，
 *   AI 只有这一招可用。
 * 必然事实：本招被提交过；潮头命中过目标（造成伤害并浇上湿透身份）。
 * 潮头一次扫到几个、以及暴击，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("waterspout", function (stage) {
    var caster = stage.pokemon({ species: "Blastoise", level: 42, moves: ["waterspout"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("waterspout") > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/soaked");
    }, function () {
        stage.expect(stage.casts("waterspout") > 0, "waterspout was committed");
        stage.expect(stage.damageTo(foe) > 0, "the tide dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the tide soaked the target");
        stage.note("waterspout observations", { casts: stage.casts("waterspout"), onFoe: stage.damageTo(foe),
            soaked: stage.hadMobEffect(foe, "world_combat:status/soaked"),
            soakedNow: stage.hasMobEffect(foe, "world_combat:status/soaked"),
            casterHealth: Math.round(caster.health() * 10) / 10 });
        stage.done();
    }, "waterspout lands");
});
