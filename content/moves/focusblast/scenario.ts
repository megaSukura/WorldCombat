/**
 * 真气弹的可执行设计说明：让会这一招的精灵对一名站桩对手蓄势后砸出真气团，验证它命中、造成伤害。
 *
 * 场面用睡眠的对手把距离固定，方便看蓄势与飞行；散布角会让真气团偏线，这是本招翻译「命中 70」的方式，
 * 所以只把「被放出过」「造成过伤害」作为必然事实，具体的偏移角度与是否暴击写进 note。
 * 施法者站定蓄势（stationary），靶子睡着不动，几发之内应当命中。
 */
Smoke.scenario("focusblast", function (stage) {
    var caster = stage.pokemon({ species: "machoke", level: 40, moves: ["focusblast"], at: [-5, 0, 0] });
    var target = stage.pokemon({ species: "snorlax", level: 45, moves: ["tackle"], status: "sleep", at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1400, function () {
        return stage.casts("focusblast", caster) > 0 && stage.damageTo(target) > 0 && stage.travelled(target) > 0.05;
    }, function () {
        stage.expect(stage.casts("focusblast", caster) > 0, "focusblast was committed");
        stage.expect(stage.damageTo(target) > 0, "the blast landed on the target");
        stage.expect(stage.travelled(target) > 0.05, "the blast knocked the target back");
        stage.note("the scatter angle and crit roll are random; damage is the heaviest single hit in the family; the target is bulky enough to survive and show the knockback", {
            casts: stage.casts("focusblast", caster),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            targetTravelled: Math.round(stage.travelled(target) * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "focusblast lands and knocks back within 70 s");
});
