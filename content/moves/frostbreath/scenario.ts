/**
 * 冰息的可执行设计说明：让会这一招的冰系精灵朝一名站在前方的岩石／地面目标呼出一片冷雾，
 * 验证冷雾罩住目标、造成伤害并把冻僵（共享身份 chill）打上去。必定要害是共享结算，写进 note 供读轨迹判断。
 * 状态的身份在效果加上的下一个 tick 才会被记录，所以断言放在 damage 之后隔几刻再做。
 */
Smoke.scenario("frostbreath", function (stage) {
    var seel = stage.pokemon({ species: "seel", level: 32, moves: ["frostbreath"], at: [-5, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 24, moves: ["tackle"], at: [0, 0, 0] });
    stage.fill([-5, -1, -1], [1, -1, 1], "minecraft:grass_block");
    stage.hostile(seel, geodude);
    stage.until(900, function () { return stage.casts("frostbreath", seel) > 0 && stage.damageTo(geodude) > 0; }, function () {
        stage.after(3, function () {
            stage.expect(stage.casts("frostbreath", seel) > 0, "冰息被呼出来了");
            stage.expect(stage.damageTo(geodude) > 0, "冷雾罩到了目标身上");
            stage.expect(stage.hadMobEffect(geodude, "world_combat:status/chill"), "被罩住的人冻僵了");
            var changed = stage.changedBlocks();
            stage.note("这一击必定命中要害（共享暴击倍率在命中时结算）；冷雾漫到才结算，走出雾外会落空。落点会租出 minecraft:snow（到期原方块回来）。",
                { casts: stage.casts("frostbreath", seel), damage: Math.round(stage.damageTo(geodude) * 10) / 10, changed: changed.length });
            stage.done();
        });
    }, "冷雾罩住目标");
});
