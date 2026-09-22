/**
 * 扮演的可执行设计说明。
 *
 * 场面：一只只会扮演的凯西（同步特性）对 4 格外的卡蒂狗（威吓特性）。双方特性不同、都是宝可梦，
 *   扮演的预检通过，AI 会在看到威胁后描摹并披上对手的特性。
 * 必然事实：本招被提交过；施法者身上出现过“扮演”标记（只有特性层真正写入时才会挂上）。
 * 随机结果：命中的时机、对手是否出手写进 note 供读轨迹判断。
 * 特性覆盖走共享的 NativeModifiers ability 层，不是 MobEffect；smoke 不能直接读特性，改动记在 note 里。
 */
Smoke.scenario("roleplay", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 40, ability: "synchronize", moves: ["roleplay"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 26, ability: "intimidate", moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: abra(40, synchronize) roleplay vs growlithe(26, intimidate); abilities differ so the cast should be accepted");
    stage.until(900, function () { return stage.hadMobEffect(caster, "world_combat:roleplay_mask"); }, function () {
        stage.expect(stage.casts("roleplay", caster) >= 1, "roleplay was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:roleplay_mask"), "roleplay_mask marker appeared on the caster");
        stage.note("roleplay committed; the Ability layer is applied through the shared NativeModifiers ability layer", {
            casts: stage.casts("roleplay", caster)
        });
        stage.done();
    }, "roleplay marker");
});
