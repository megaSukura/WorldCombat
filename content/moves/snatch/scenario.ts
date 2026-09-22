// 抢夺的可执行设计说明：让一只只会抢夺的宝可梦对一名不断给自己加状态的对手张手。
// 必然事实：抢夺被提交过——本招的提交只在真正夺到那一手时发生（窗口空手而回会 reject，不结账），
//   所以 casts>=1 同时证明：窗口张开过、对手在窗口里提交了可夺的招式、那一手被接在施法者身上。
// 场景额外装配已有的 workup 单元作为对手的招式来源（不是本招的依赖，只在 smoke 装配时引入），
// 与自我暗示的场面一样：自身增益动作会让对手丢掉原生攻击目标，夹具每 15 刻重申一次敌对。
// 随机结果（夺到的是哪一手、窗口等了多久）写进 note 供读轨迹判断。
Smoke.scenario("snatch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "zoroark", level: 40, moves: ["snatch"], at: [-3, 0, 0] });
    // 只会自我激励的对手：它的 workup 带原生 snatch 旗标，冷却很短，会在窗口里反复提交。
    var target = stage.pokemon({ species: "machop", level: 28, moves: ["workup"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    var reps = 0;
    function rehost() { stage.hostile(caster, target); if (reps++ < 160) stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.note("staged with the workup unit as a fixture: zoroark(40) snatch vs machop(28) workup at 6 blocks; workup carries the native snatch flag");
    stage.until(1400, function () { return stage.casts("snatch", caster) >= 1; }, function () {
        stage.expect(stage.casts("snatch", caster) >= 1, "snatch was committed (a self status move was actually taken)");
        stage.note("snatch committed; the stolen move now belongs to the caster. Read the cast line right after it to see which move came through.", {
            snatchCasts: stage.casts("snatch", caster), workups: stage.casts("workup", target),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "snatch takes a self status move");
});
