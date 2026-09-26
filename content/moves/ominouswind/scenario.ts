/**
 * 奇异之风的可执行设计说明：让会这一招的梦妖魔（Mismagius，真实学习者）对一只睡眠的远距目标放风。
 *
 * 必然事实：本招被提交过（`stage.casts`）；幽风追到目标脚下收拢并造成伤害（`damageTo`）。
 * 反哺是否触发（约 10% 起）、把目标朝中心收拢了多少都写进 note 供读轨迹判断；
 * 有限转向、总路程与走位躲风由完整装配的人工试玩核对。
 */
Smoke.scenario("ominouswind", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mismagius", level: 38, moves: ["ominouswind"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "abra", level: 20, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ominouswind", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("ominouswind", caster) >= 1, "the caster committed ominous wind");
            stage.expect(stage.damageTo(foe) > 0, "the spectral squall reached and damaged the distant foe");
            stage.note("the ~10% surge roll, how far the coil pulled the foe and how often a moving target would escape the homing travel are random/positional", {
                casts: stage.casts("ominouswind", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "ominous wind reaches the foe within 70 s");
});
