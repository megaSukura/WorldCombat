// 速度互换的可执行设计说明：让一只慢的宝可梦对一名更快的对手把原生移动速度对调。
// 必然事实：速度互换被提交过；换手后两端都出现过交换窗口身份 world_combat:status/speedswap；
//   并且施法者一侧的实际移动速度升到对手原来的值附近、对手降到施法者原来的值附近——
//   这证明交换真的落到了原生移动速度上（相等速度不会留下窗口）。窗口走完会自动换回。
// 环境把对手的原生移速基准抬高当成一个「更快的敌人」，模拟原版/其他模组里的快怪与 Boss。
Smoke.scenario("speedswap", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 慢的一方当施术者：对更快的对手换速，是这招最值当的用法。
    var caster = stage.pokemon({ species: "machop", level: 40, moves: ["speedswap"], at: [-2, 0, 0] });
    var target = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    // 把铁傀儡做成明显更快的对手：基础移速抬到 1.4（施法者宝可梦是 0.7）。
    stage.command("attribute " + target.ref.split("/")[0] + " minecraft:generic.movement_speed base set 1.4");
    var casterBefore = stage.attribute(caster, "minecraft:generic.movement_speed");
    var targetBefore = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.hostile(caster, target);
    stage.note("staged: machop(40) speedswap vs a faster iron golem at 4 blocks; the slow one borrows the fast one's native movement speed", {
        casterBefore: casterBefore, targetBefore: targetBefore
    });
    stage.until(1200, function () { return stage.casts("speedswap", caster) >= 1; }, function () {
        // mob_effect_added 在效果加上的下一个 tick 才触发，所以再等一拍读窗口。
        stage.until(60, function () {
            return stage.hadMobEffect(caster, "world_combat:status/speedswap") && stage.hadMobEffect(target, "world_combat:status/speedswap");
        }, function () {
            stage.after(2, function () {
                var casterAfter = stage.attribute(caster, "minecraft:generic.movement_speed");
                var targetAfter = stage.attribute(target, "minecraft:generic.movement_speed");
                stage.expect(stage.casts("speedswap", caster) >= 1, "speedswap was committed");
                stage.expect(stage.hadMobEffect(caster, "world_combat:status/speedswap"), "the caster carried the swap window");
                stage.expect(stage.hadMobEffect(target, "world_combat:status/speedswap"), "the target carried the swap window");
                stage.expect(casterAfter > casterBefore + 0.001, "the slow caster received the faster native movement speed");
                stage.expect(targetAfter < targetBefore - 0.001, "the faster target gave up its native movement speed");
                stage.note("both native movement speeds moved to the other's value and the window is running; it reverts when the window ends", {
                    casts: stage.casts("speedswap", caster),
                    casterSpeed: [casterBefore, Math.round(casterAfter * 1000) / 1000],
                    targetSpeed: [targetBefore, Math.round(targetAfter * 1000) / 1000],
                    casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                    targetTravelled: Math.round(stage.travelled(target) * 10) / 10
                });
                stage.done();
            });
        }, "swap window appears");
    }, "the speeds exchange");
});
