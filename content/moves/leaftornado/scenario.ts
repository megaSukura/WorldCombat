/**
 * 青草搅拌器的可执行设计说明。
 *
 * 场面：一只只会青草搅拌器的施法者，对四格外的对手。旋风会在对手位置立起并持续切割。
 * 必然事实：本招被提交过；对手受到过青草搅拌器伤害。
 * 拍数、每拍致盲概率与级数由速度/特攻决定，目标也可能走出旋风；等到命中后再多等一段，
 * 让整圈旋风跑完，note 记录累计伤害供读轨迹判断。
 */
Smoke.scenario("leaftornado", function (stage) {
    const caster = stage.pokemon({ species: "Oddish", level: 32, moves: ["leaftornado"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("leaftornado", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        stage.after(110, function () {
            stage.expect(stage.casts("leaftornado", caster) >= 1, "leaftornado was committed");
            stage.expect(stage.damageTo(foe) > 0, "the target took leaftornado damage");
            stage.note("旋风按 point 放在选定落点后固定不动，拍数由 duration/interval 决定，目标可以走出范围躲开后续切割；致盲每目标整场只结算一次", {
                casts: stage.casts("leaftornado", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                movedFoe: Math.round(stage.travelled(foe) * 10) / 10
            });
            stage.done();
        });
    }, "leaftornado cast and hit");
});
