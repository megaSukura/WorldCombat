/**
 * 山岚摔的可执行设计说明：让会这一招的格斗系精灵贴近一名低等级格斗系目标（练手桩），
 * 验证它被摔实、造成伤害并把「摔翻」（共享身份 stagger）打上去。必定要害是共享结算，写进 note 供读轨迹判断。
 * 状态的身份在效果加上的下一个 tick 才会被记录，所以断言放在 damage 之后隔几刻再做。
 */
Smoke.scenario("stormthrow", function (stage) {
    var throh = stage.pokemon({ species: "throh", level: 34, moves: ["stormthrow"], at: [-3, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 20, moves: ["tackle"], at: [0, 0, 0] });
    stage.fill([-3, -1, -1], [1, -1, 1], "minecraft:grass_block");
    stage.hostile(throh, machop);
    stage.until(900, function () { return stage.casts("stormthrow", throh) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.after(3, function () {
            stage.expect(stage.casts("stormthrow", throh) > 0, "山岚摔被放出来了");
            stage.expect(stage.damageTo(machop) > 0, "摔击打到了目标身上");
            stage.expect(stage.hadMobEffect(machop, "world_combat:status/stagger"), "被摔翻的人进入了摔翻状态");
            stage.note("这一摔必定命中要害（共享暴击倍率在命中时结算）；它是近身擒摔，目标在抓住前退出抓取距离会抓空。落点会租出 minecraft:coarse_dirt（到期原方块回来）。",
                { casts: stage.casts("stormthrow", throh), damage: Math.round(stage.damageTo(machop) * 10) / 10,
                  changed: stage.changedBlocks().length });
            stage.done();
        });
    }, "山岚摔摔实目标");
});
