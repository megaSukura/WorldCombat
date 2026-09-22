/**
 * 蓄能焰袭 / flamecharge 的可执行设计说明。
 *
 * 场面：一只只会蓄能焰袭的风速狗与一只弱小的对手在石地上相隔 6 格开战。
 * 必然事实：本招被提交过、对手受过蓄能焰袭的伤害。
 * 命中时目标是否被推、暴击、以及冲锋实际走了几格，都会随走位变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("flamecharge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "arcanine", level: 45, moves: ["flamecharge"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("flamecharge", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("flamecharge", caster) >= 1, "caster committed flame charge");
            stage.expect(stage.damageTo(foe) > 0, "flame charge dealt damage to the foe");
            stage.note("knockback, crit and the actual charge distance vary with positioning", {
                casts: stage.casts("flamecharge", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "flame charge lands within 60 s");
});
