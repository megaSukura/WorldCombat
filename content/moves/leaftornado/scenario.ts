/**
 * 青草搅拌器的可执行设计说明。
 *
 * 场面：一只只会青草搅拌器的施法者，对八格外的对手。旋风在对手位置的真实地面落点立起，作为独立区域持续切割。
 * 必然事实：本招被提交过；对手受到过青草搅拌器伤害。
 * 区域在落点固定不动、按自己的时长一拍一拍切到结束；只有真被切到才可能降命中，且每目标整场最多一次；
 * 目标也可能走出范围。这些写进 note 供读轨迹判断。
 */
Smoke.scenario("leaftornado", function (stage) {
    const caster = stage.pokemon({ species: "Oddish", level: 32, moves: ["leaftornado"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("leaftornado", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        stage.after(110, function () {
            stage.expect(stage.casts("leaftornado", caster) >= 1, "leaftornado was committed");
            stage.expect(stage.damageTo(foe) > 0, "the target took leaftornado damage");
            stage.note("旋风是绑在自己托管区域效果上的独立区域，术者随后可自由行动；拍数为 round(duration/interval)，区域活满 duration；只有真造成伤害才掷一次命中下降，每目标整场最多成功一次", {
                casts: stage.casts("leaftornado", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                movedFoe: Math.round(stage.travelled(foe) * 10) / 10
            });
            stage.done();
        });
    }, "leaftornado cast and hit");
});
