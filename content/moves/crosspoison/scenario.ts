/**
 * 十字毒刃 / crosspoison —— 可执行设计说明。
 *
 * 一句话：一只只会十字毒刃的叉字蝠（crobat，L40，原生学习者）贴近对手，两片毒刃从左右同时合拢剪出一个 X，
 *   刃口先抹一次毒，过一瞬切口里的毒再渗一次。
 *
 * 场面：一只昏睡、不动的卡比兽（snorlax，L30）站在 2 格外——在出手距离附近，逼 AI 先走完接近再剪；
 *   昏睡让目标留在原地，两刃的合拢判定不因走位失效；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；正对目标受到过剪击伤害（`stage.damageTo`）。
 * 初毒与渗毒都是掷签、暴击与副目标是否被剪到都是随机的，写进 note 供读轨迹判断。
 */
Smoke.scenario("crosspoison", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crobat", level: 40, moves: ["crosspoison"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], status: "sleep", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("crosspoison", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("crosspoison", caster) >= 1, "the caster committed cross poison");
            stage.expect(stage.damageTo(foe) > 0, "cross poison dealt slash damage to the foe");
            stage.note("the initial poison roll, the later seep roll, crits and whether a secondary in the scissor line was caught are random/positional", {
                casts: stage.casts("crosspoison", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foePoisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "cross poison scissors a foe within 70 s");
});
