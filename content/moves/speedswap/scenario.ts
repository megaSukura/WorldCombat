// 速度互换的可执行设计说明：让一只慢的宝可梦对一名快的对手把速度对调。
// 必然事实：速度互换被提交过；随后双方身上都出现过交换窗口身份 world_combat:status/speedswap——
//   这证明有效速度确实被换到了新位置（没有可换的差异时不会挂窗口）。窗口走完会自动换回。
// 速度等级本身 smoke 读不到，实际换到的档位与两人读数写进 note 供读轨迹判断。
Smoke.scenario("speedswap", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 慢的一方当施术者：对更快的对手换速，是这招最值当的用法。
    var caster = stage.pokemon({ species: "machop", level: 40, moves: ["speedswap"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "alakazam", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: machop(40) speedswap vs alakazam(30) tackle at 4 blocks; the slow one borrows the fast one's speed");
    stage.until(1200, function () { return stage.casts("speedswap", caster) >= 1; }, function () {
        stage.expect(stage.casts("speedswap", caster) >= 1, "speedswap was committed");
        // mob_effect_added 在效果加上的下一个 tick 才触发，所以再等一拍读窗口。
        stage.until(60, function () {
            return stage.hadMobEffect(caster, "world_combat:status/speedswap") && stage.hadMobEffect(target, "world_combat:status/speedswap");
        }, function () {
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/speedswap"), "the caster carried the swap window");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/speedswap"), "the target carried the swap window");
            stage.note("both speeds moved to the other's effective value and the window is running; it reverts when the window ends", {
                casts: stage.casts("speedswap", caster), casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                targetTravelled: Math.round(stage.travelled(target) * 10) / 10
            });
            stage.done();
        }, "swap window appears");
    }, "the speeds exchange");
});
