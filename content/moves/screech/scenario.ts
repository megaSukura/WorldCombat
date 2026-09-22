// 刺耳声的可执行设计说明：一只只会刺耳声的 Zubat 与两只排成一线的僵尸隔几格开战。
// 必然事实：本招被提交过；至少一只僵尸的护甲下降（物防落到 armor 属性）、并挂上共享身份 world_combat:status/deafened。
// 走廊到底罩住几只、掉 2 级还是 3 级随站位与配置变化，写进 note 供读轨迹判断。
Smoke.scenario("screech", function (stage) {
    stage.fill([-8, -1, -6], [12, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "zubat", level: 35, moves: ["screech"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    var armorA = stage.attribute(foeA, "minecraft:generic.armor");
    var armorB = stage.attribute(foeB, "minecraft:generic.armor");
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("screech", caster) > 0
            && (stage.hadMobEffect(foeA, "world_combat:status/deafened") || stage.hadMobEffect(foeB, "world_combat:status/deafened"))
            && (stage.attribute(foeA, "minecraft:generic.armor") < armorA - 0.001
                || stage.attribute(foeB, "minecraft:generic.armor") < armorB - 0.001);
    }, function () {
        stage.expect(stage.casts("screech", caster) > 0, "screech was committed");
        stage.expect(stage.hadMobEffect(foeA, "world_combat:status/deafened") || stage.hadMobEffect(foeB, "world_combat:status/deafened"),
            "a deafened identity landed on a target");
        stage.expect(stage.attribute(foeA, "minecraft:generic.armor") < armorA - 0.001
            || stage.attribute(foeB, "minecraft:generic.armor") < armorB - 0.001,
            "at least one target's armour fell with the Defense drop");
        stage.note("screech observations", {
            casts: stage.casts("screech", caster),
            armorA: [armorA, stage.attribute(foeA, "minecraft:generic.armor")],
            armorB: [armorB, stage.attribute(foeB, "minecraft:generic.armor")],
            deafenedA: stage.hadMobEffect(foeA, "world_combat:status/deafened"),
            deafenedB: stage.hadMobEffect(foeB, "world_combat:status/deafened"),
            moved: Math.round((stage.travelled(foeA) + stage.travelled(foeB)) * 10) / 10
        });
        stage.done();
    }, "screech pierced the line");
});
