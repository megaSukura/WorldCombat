/**
 * 自我暗示的可执行设计说明。
 *
 * 场面：一只只会自我暗示的凯西（特攻高、能读得远）对 3 格外的腕力。角色绑定后，腕力的攻/特攻通过共享等级机制
 *   预先抬高，自我暗示因此有实际可抄的净收益；本场景不需要任何外部招式单元作夹具。
 * 必然事实：本招被提交过；施术者身上出现过“已同调”标记（只有实际抄到至少一项时才会挂上）。
 * 说明：每 15 刻重申一次敌对，抵消目标脱战；随机结果写进 note 供读轨迹判断。
 * 等级写入走原生等级（NativeEffects.boost），不是 MobEffect；smoke 不能直接读等级，改动记在 note 里。
 */
Smoke.scenario("psychup", function (stage) {
    var caster = stage.pokemon({ species: "Abra", level: 42, moves: ["psychup"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 24, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    function rehost() { stage.hostile(caster, target); stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.after(3, function () {
        // Raise the target's ladder after actor binding so psychup has a real net gain to copy.
        stage.boost(target, { atk: 1, spa: 1 });
        stage.expect(stage.stages(target).atk === 1 && stage.stages(target).spa === 1, "the target's ladder is installed after actor binding");
        stage.note("staged: abra(42) psychup vs machop(24) whose attack/special attack were raised through the shared stage ladder");
        stage.until(1200, function () { return stage.hadMobEffect(caster, "world_combat:psychup_link"); }, function () {
            stage.expect(stage.casts("psychup", caster) >= 1, "psychup was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:psychup_link"), "psychup_link marker appeared on the caster");
            stage.note("psychup committed; the stat ladder is copied through NativeEffects.boost / CombatStages", {
                casts: stage.casts("psychup", caster)
            });
            stage.done();
        }, "psychup link");
    });
});
