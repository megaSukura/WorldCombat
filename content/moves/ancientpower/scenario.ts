/**
 * 原始之力的可执行设计说明：让会这一招的菊石兽（Omastar，真实学习者）对身侧不远的睡眠对手轰开脚下的古力。
 *
 * 必然事实：本招被提交过（`stage.casts`）；以自身为中心的一圈轰到并造成伤害（`damageTo`）。
 * 对手就站在冲击半径以内，AI 不必先走位即可施放；更远的敌人会交给共享接近逻辑先收身位，
 * 由完整装配的人工试玩核对。反哺是否触发（约 10% 起）、推开多远、托起多高都写进 note 供读轨迹判断。
 */
Smoke.scenario("ancientpower", function (stage) {
    stage.fill([-8, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "omastar", level: 36, moves: ["ancientpower"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ancientpower", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("ancientpower", caster) >= 1, "the caster committed ancient power");
            stage.expect(stage.damageTo(foe) > 0, "the primal ring damaged the nearby foe");
            stage.note("the ~10% surge roll, how far the foe was pushed and lifted, and how many nearby foes the ring caught are random/positional", {
                casts: stage.casts("ancientpower", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "ancient power erupts around the caster within 70 s");
});
