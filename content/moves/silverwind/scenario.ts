/**
 * 银色旋风的可执行设计说明：让会这一招的末入蛾（Venomoth，真实学习者）对一只睡眠的对手抖出鳞粉扇。
 *
 * 必然事实：本招被提交过（`stage.casts`）；扇面罩到并造成伤害（`damageTo`）。
 * 反哺是否触发（约 10% 起）与扇面一次割到几人写进 note 供读轨迹判断；
 * 掩体遮挡与扇边走位由完整装配的人工试玩核对。
 */
Smoke.scenario("silverwind", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "venomoth", level: 38, moves: ["silverwind"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    var side = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], status: "sleep", at: [3, 0, 2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, side);
    stage.until(1400, function () {
        return stage.casts("silverwind", caster) >= 1 && (stage.damageTo(foe) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("silverwind", caster) >= 1, "the caster committed silver wind");
            stage.expect(stage.damageTo(foe) > 0 || stage.damageTo(side) > 0, "the scale fan cut at least one foe in the sector");
            stage.note("the ~10% surge roll, how many foes the fan caught and whether the second foe stood inside the sector are random/positional", {
                casts: stage.casts("silverwind", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "silver wind cuts a foe within 70 s");
});
