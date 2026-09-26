/**
 * 双光束 / twinbeam —— 可执行设计说明。
 *
 * 一句话：一只会双光束的伙伴从两只眼睛各射出一道灵光，两道光收拢到同一个对手身上，至少一道命中。
 *
 * 场面：一只只会双光束的麒麟奇（girafarig，L32，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L32），
 *   相隔 8 格——在射程内，AI 可以在远处直接并射；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一道光的伤害（`stage.damageTo`）。
 *   每道从真实眼位朝瞄点射出、只取第一接触：两道的命中与暴击、共鸣还是并射、两道是否打中同一目标
 *   （只有同目标才触发共鸣），都是结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("twinbeam", function (stage) {
    stage.fill([-12, -1, -10], [12, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "girafarig", level: 32, moves: ["twinbeam"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 32, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("twinbeam", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("twinbeam", caster) >= 1, "the caster committed twinbeam");
            stage.expect(stage.damageTo(foe) > 0, "twinbeam dealt damage to the foe");
            stage.note("each beam is a real trace from its own eye that stops at its first contact; in resonance form the second gains a bonus only when both beams strike the same target; crit is variable", {
                casts: stage.casts("twinbeam", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "twinbeam connects within 70 s");
});
