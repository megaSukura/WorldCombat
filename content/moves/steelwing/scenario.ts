/**
 * 钢翼 / steelwing 的可执行设计说明。
 *
 * 场面：只会钢翼的飞天螳螂（Scyther，钢翼真实学习者，30 级）对一只厚血的卡比兽（Snorlax，30 级，只会跃起），
 *   石地、白天、晴。必然事实：本招被提交过（`stage.casts`）；横扫命中并造成伤害（贴身，扫面覆盖目标）。
 * 升防几率（约 10%）与扫中几人写进 note 供读轨迹；本场景只放一个目标，多人扇面由完整装配的人工试玩核对。
 */
Smoke.scenario("steelwing", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 30, moves: ["steelwing"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("steelwing", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("steelwing", caster) >= 1, "the caster committed steel wing");
            stage.expect(stage.damageTo(foe) > 0, "the steel wing sweep dealt damage to the foe");
            stage.note("the ~10% harden roll and how many foes the fan caught are random/positional; this arena has one target", {
                casts: stage.casts("steelwing", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "steel wing lands on a foe at close range");
});
