/**
 * 彗星拳的可执行设计说明：让会这一招的巨金怪（Metagross，真实学习者）短靠到位、对一只僵尸砸下流星重拳。
 *
 * 必然事实：本招被提交过（`stage.casts`）；正面砸中并造成伤害（`damageTo`）。
 * 反哺是否触发（约 20% 起）、震开几人、落拳首碰点在哪都写进 note 供读轨迹判断；
 * 本场景只放一个目标，靠步加拳程的固定总距离与落点连震由完整装配的人工试玩核对。
 */
Smoke.scenario("meteormash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "metagross", level: 46, moves: ["meteormash"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("meteormash", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("meteormash", caster) >= 1, "the caster committed meteor mash");
            stage.expect(stage.damageTo(foe) > 0, "the meteor punch damaged the foe");
            stage.note("the ~20% attack-surge roll, how many foes the landing shock caught, the real first contact and whether the ground was scorched are random/positional", {
                casts: stage.casts("meteormash", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "meteor mash lands on a foe within 60 s");
});
