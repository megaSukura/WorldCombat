// 魔法反射的可执行设计说明：让一只只会魔法反射的宝可梦面对一名不停朝它瞪眼的对手。
// 必然事实：魔法反射被提交过——本招的提交只在真正弹回一手时发生（膜没接到东西会 reject，不结账），
//   所以 casts>=1 同时证明：膜撑开过、对手在窗口里朝施法者提交了可反射的招式、那一手被对准原施放者打出。
// 对手用 scaryface（原生 reflectable 旗标、单体朝向施法者）而不是一次性的异常状态招；被弹回后它落在对手自己身上，
// 对手仍会继续重试。场景额外装配已有的 scaryface 单元作为招式来源（不是本招的依赖，只在 smoke 装配时引入）。
// 自身防护动作会让对手丢掉原生攻击目标，夹具每 15 刻重申一次敌对。随机结果写进 note 供读轨迹判断。
Smoke.scenario("magiccoat", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "espeon", level: 40, moves: ["magiccoat"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "machop", level: 28, moves: ["scaryface"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    var reps = 0;
    function rehost() { stage.hostile(caster, target); if (reps++ < 160) stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.note("staged with the scaryface unit as a fixture: espeon(40) magiccoat vs machop(28) scaryface at 6 blocks; scaryface carries the native reflectable flag and is a single-target gaze");
    stage.until(1800, function () { return stage.casts("magiccoat", caster) >= 1; }, function () {
        stage.expect(stage.casts("magiccoat", caster) >= 1, "magiccoat was committed (a reflectable move was actually bounced)");
        stage.note("magiccoat committed; the bounced move now runs from the caster against the original user.", {
            magiccoatCasts: stage.casts("magiccoat", caster), scaryfaceCasts: stage.casts("scaryface", target)
        });
        stage.done();
    }, "magiccoat bounces a reflectable move");
});
