/**
 * 掷泥的可执行设计说明。
 *
 * 场面：一只只会掷泥的施法者，对八格外的对手。泥团会抛过去、命中并溅开。
 * 必然事实：本招被提交过；对手受到过掷泥伤害；伤害真正落地后，共享 accuracy 能力等级被压低。
 * 选取是 aim（玩家可朝方向/世界点空放），AI 仍按仇恨推荐敌人；空放与目标离场只按原方向落空，写进 note 供读轨迹判断。
 */
Smoke.scenario("mudslap", function (stage) {
    const caster = stage.pokemon({ species: "Sandshrew", level: 30, moves: ["mudslap"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 20, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("mudslap", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("mudslap", caster) >= 1, "mudslap was committed");
        stage.expect(stage.damageTo(foe) > 0, "the target took mudslap damage");
        stage.expect(stage.stages(foe).accuracy <= -1, "the landed mud dropped the target's accuracy");
        stage.note("伤害真正落地才削命中（NativeEffects.boost accuracy），级数由特攻与厚泥决定；aim 空放/目标离场按原方向落空，方块只留泥印不成区", {
            casts: stage.casts("mudslap", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            accuracy: stage.stages(foe).accuracy
        });
        stage.done();
    }, "mudslap cast and hit");
});
