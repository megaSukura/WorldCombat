/**
 * 火之舞 / fierydance 的可执行设计说明。
 *
 * 场面：只会火之舞的火神蛾（Volcarona，火之舞唯一学习者，55 级）贴身一只厚血的卡比兽（Snorlax，40 级，
 *   只会跃起），石地、白天、晴。必然事实：本招被提交过（`stage.casts`）；两拍里内圈先扫到目标并造成伤害
 *   （贴脸，内圈必然覆盖）。
 * 升特攻掷（约 50%）与第二拍外圈是否另有人被卷到写进 note；本场景只放一个目标，多圈由完整装配的人工试玩核对。
 */
Smoke.scenario("fierydance", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "volcarona", level: 55, moves: ["fierydance"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("fierydance", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("fierydance", caster) >= 1, "the caster committed fiery dance");
            stage.expect(stage.damageTo(foe) > 0, "the fire dance dealt damage to the foe");
            stage.note("the ~50% Sp. Atk roll and which beat catches which foe are random/positional; this arena has one target", {
                casts: stage.casts("fierydance", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fiery dance lands on a foe at close range");
});
