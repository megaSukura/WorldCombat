/**
 * 幻象光线 的可执行设计说明：让会这一招的凯西朝一名格斗系对手射出一道追踪紫光，验证紫光被放出、追上目标并造成伤害。
 * 恍惚（基础 10% 起）、穿透（需回响）与「被打散时再叠一层」都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("psybeam", function (stage) {
    var abra = stage.pokemon({ species: "abra", level: 30, moves: ["psybeam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 24, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(abra, machop);
    stage.until(900, function () { return stage.casts("psybeam", abra) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("psybeam", abra) > 0, "追踪紫光被射出来了");
        stage.expect(stage.damageTo(machop) > 0, "紫光追上了目标并造成伤害");
        stage.note("恍惚（基础 10% 起，特攻与等级提高）与回响穿透都是随机或配置结果，只作记录。",
            { casts: stage.casts("psybeam", abra), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              tranced: stage.hasMobEffect(machop, "world_combat:status/confusion") });
        stage.done();
    }, "紫光追上目标");
});
