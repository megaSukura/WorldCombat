/**
 * 魔法火焰的可执行设计说明：让会这一招的精灵朝一名对手吐出一枚追踪火团，验证它命中、造成伤害。
 * 缠火状态（本单元 world_combat:status/mysticalfire）与点燃、是否缠满全程、目标是否挣脱都是命中后/位置结果，
 * 写进 note 供读轨迹判断；命中的火团一定先抽 1 级特攻，缠满再抽 1 级。
 */
Smoke.scenario("mysticalfire", function (stage) {
    var houndoom = stage.pokemon({ species: "houndoom", level: 38, moves: ["mysticalfire"], at: [-7, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(houndoom, machop);
    stage.until(900, function () { return stage.casts("mysticalfire", houndoom) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("mysticalfire", houndoom) > 0, "魔法火焰被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "追踪火团打到了目标身上");
        stage.note("点燃概率、缠火是否缠满全程（跑远会挣脱、状态被清除会同步解除）、以及收束再抽一级特攻都是随机/位置结果，只作记录。",
            { casts: stage.casts("mysticalfire", houndoom), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              burned: stage.hadMobEffect(machop, "world_combat:status/burn"),
              wrapped: stage.hasMobEffect(machop, "world_combat:status/mysticalfire") });
        stage.done();
    }, "追踪火团命中目标");
});
