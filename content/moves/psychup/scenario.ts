/**
 * 自我暗示的可执行设计说明。
 *
 * 场面：一只只会自我暗示的凯西（特攻高、能读得远）对 3 格外的腕力。腕力只会自我激励，开战后先给自己加上
 *   攻/特攻的等级阶梯，自我暗示因此有东西可抄。为了让目标持续产生能力变化，本场景额外装配了已有的 workup
 *   单元作为夹具（不是本招的依赖，只在 smoke 装配时引入）。
 * 必然事实：本招被提交过；施术者身上出现过“已同调”标记（只有实际抄到至少一项时才会挂上）。
 * 说明：自我激励这类自身增益动作会让目标丢掉原生攻击目标，夹具因此每 15 刻重申一次敌对，让施术者持续
 *   把它读成威胁；这是夹具细节，不影响招式本身的判定。随机结果写进 note 供读轨迹判断。
 * 阶梯写入走原生等级（NativeEffects.boost），不是 MobEffect；smoke 不能直接读等级，改动记在 note 里。
 */
Smoke.scenario("psychup", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 42, moves: ["psychup"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 24, moves: ["workup"], at: [1, 0, 0] });
    stage.hostile(caster, target);
    function rehost() { stage.hostile(caster, target); stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.note("staged with the workup unit as a fixture: machop(24) raises its own stats so abra(42) has something to copy");
    stage.until(1200, function () { return stage.hadMobEffect(caster, "world_combat:psychup_link"); }, function () {
        stage.expect(stage.casts("psychup", caster) >= 1, "psychup was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:psychup_link"), "psychup_link marker appeared on the caster");
        stage.note("psychup committed; the stat ladder is copied through NativeEffects.boost / CombatStages", {
            casts: stage.casts("psychup", caster),
            workups: stage.casts("workup", target)
        });
        stage.done();
    }, "psychup link");
});
