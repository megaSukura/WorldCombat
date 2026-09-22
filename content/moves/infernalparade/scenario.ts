/**
 * 群魔乱舞的可执行设计说明。
 *
 * 场面：一只火暴兽在 9 格外朝怪力（没有招式、站着）起舞。怪力是格斗系，对幽灵系的乱舞不免疫，
 * 因此鬼火的直接伤害能被断言到。距离在射程内，AI 会直接召出鬼火追踪。
 * 必然事实：本招被提交过；火暴兽用鬼火造成过伤害。整队威力按团数均分，因此伤害会出现多次小额。
 * 追踪是否收拢、30% 的灼伤是否发生写成 note，供读轨迹判断。
 */
Smoke.scenario("infernalparade", function (stage) {
    var user = stage.pokemon({ species: "Typhlosion", level: 30, moves: ["infernalparade"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "Machamp", level: 40, moves: [], at: [3, 0, 0] });
    stage.hostile(user, target);
    stage.until(800, function () {
        return stage.casts("infernalparade") > 0 && stage.damageBy(user) > 0;
    }, function () {
        stage.expect(stage.casts("infernalparade") > 0, "infernalparade was committed");
        stage.expect(stage.damageBy(user) > 0, "infernalparade dealt damage");
        stage.note("infernalparade observations", {
            casts: stage.casts("infernalparade"), onTarget: Math.round(stage.damageTo(target) * 10) / 10,
            burning: stage.hasMobEffect(target, "world_combat:status/burn"),
            moved: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "parade lands");
});
