/**
 * 骨棒 / boneclub 的可执行设计说明。
 *
 * 场面：只会骨棒的卡拉卡拉（Cubone）站在一片石板地上，面对 3.5 格外的一只僵尸；夜间（僵尸不会被日光灼烧），
 * 伤害只可能来自这一棍。两者开战，AI 只有这一招可用（默认直刺式）。
 * 必然事实：本招被提交过；目标受到过伤害（刺中或扫中）。
 * 命中只有 85，是否抡空、是否敲懵、暴击，都是概率与站位结果；本招不再改地面，写进 note 供读轨迹判断。
 */
Smoke.scenario("boneclub", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "cubone", level: 30, moves: ["boneclub"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("boneclub", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            var changed = stage.changedBlocks().filter(function (entry) { return entry.before !== entry.after; });
            stage.expect(stage.casts("boneclub", caster) > 0, "boneclub was committed");
            stage.expect(stage.damageTo(foe) > 0, "the club dealt damage");
            stage.note("the 85-accuracy thrust, whiffs, the stagger roll and crits are random/positional; whiffs no longer change the ground", {
                casts: stage.casts("boneclub", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                changedBlocks: changed.length,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "boneclub lands on a foe within reach");
});
