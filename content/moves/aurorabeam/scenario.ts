/**
 * 极光束的可执行设计说明：让会这一招的冰系对手朝一名格斗系目标射一道虹光，验证光束命中、造成伤害。
 * 降攻（基础 10% 起）与落点霜斑是随机／地形结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("aurorabeam", function (stage) {
    var seel = stage.pokemon({ species: "seel", level: 32, moves: ["aurorabeam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(seel, machop);
    stage.until(900, function () { return stage.casts("aurorabeam", seel) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("aurorabeam", seel) > 0, "极光束被射出来了");
        stage.expect(stage.damageTo(machop) > 0, "虹光打到了目标身上");
        stage.note("降攻（基础 10% 起）是随机结果；落点会租出一小片霜（minecraft:packed_ice），到期原方块回来。",
            { casts: stage.casts("aurorabeam", seel), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              blocks: stage.changedBlocks().length });
        stage.done();
    }, "虹光命中目标");
});
