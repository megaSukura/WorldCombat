/**
 * 角撞 / hornattack 的可执行设计说明。
 *
 * 场面：一只只会角撞的铁甲犀牛（Rhyhorn，体重给的是推力）面对约 2 格外的一只僵尸；设为夜晚，
 * 僵尸不会被日光灼烧，伤害只可能来自这一顶。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（正面顶实）。
 * 目标与本体都走原生受击/位移（保留抗击退）：被推走多远、是否撞墙或满抗性而提前松角、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("hornattack", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Rhyhorn", level: 25, moves: ["hornattack"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("hornattack", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("hornattack", caster) > 0, "hornattack was committed");
            stage.expect(stage.damageTo(foe) > 0, "the horn gore dealt damage");
            stage.note("低头顶中后锁住角、把目标沿地面推走一段；双方位移都走原生受击位移，满抗击退目标只吃初伤不被搬", {
                casts: stage.casts("hornattack", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "hornattack gores and shoves the foe");
});
