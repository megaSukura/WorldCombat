/**
 * 辣椒精华的可执行设计说明。
 *
 * 场面：一只只会辣椒精华的狠辣椒与两只挤在一起的敌人僵尸（相隔 1 格）开战。两只僵尸都会走近并近战。
 * 默认配置是原液浓缩：射程 6、半径 1.6，落点足以同时罩住这两只。
 * 必然事实：本招被提交过；两只僵尸的攻击属性都升高、护甲属性都下降（辣雾对范围内所有非友方结算）。
 * 具体辣到几只、投掷是否落空写进 note 供读轨迹判断。
 */
Smoke.scenario("spicyextract", function (stage) {
    var caster = stage.pokemon({ species: "Scovillain", level: 40, moves: ["spicyextract"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [7, 0, 1] });
    var attackA = stage.attribute(foeA, "minecraft:generic.attack_damage");
    var attackB = stage.attribute(foeB, "minecraft:generic.attack_damage");
    var armorA = stage.attribute(foeA, "minecraft:generic.armor");
    var armorB = stage.attribute(foeB, "minecraft:generic.armor");
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(800, function () {
        return stage.casts("spicyextract") > 0
            && stage.attribute(foeA, "minecraft:generic.attack_damage") > attackA + 0.001
            && stage.attribute(foeB, "minecraft:generic.attack_damage") > attackB + 0.001
            && stage.attribute(foeA, "minecraft:generic.armor") < armorA - 0.001
            && stage.attribute(foeB, "minecraft:generic.armor") < armorB - 0.001;
    }, function () {
        stage.expect(stage.casts("spicyextract") > 0, "spicyextract was committed");
        stage.expect(stage.attribute(foeA, "minecraft:generic.attack_damage") > attackA + 0.001, "the first target's Attack rose");
        stage.expect(stage.attribute(foeB, "minecraft:generic.attack_damage") > attackB + 0.001, "the second target's Attack rose");
        stage.expect(stage.attribute(foeA, "minecraft:generic.armor") < armorA - 0.001, "the first target's armour fell");
        stage.expect(stage.attribute(foeB, "minecraft:generic.armor") < armorB - 0.001, "the second target's armour fell");
        stage.note("spicyextract observations", {
            casts: stage.casts("spicyextract"),
            attackA: [attackA, stage.attribute(foeA, "minecraft:generic.attack_damage")],
            attackB: [attackB, stage.attribute(foeB, "minecraft:generic.attack_damage")],
            armorA: [armorA, stage.attribute(foeA, "minecraft:generic.armor")],
            armorB: [armorB, stage.attribute(foeB, "minecraft:generic.armor")],
            moved: Math.round((stage.travelled(foeA) + stage.travelled(foeB)) * 10) / 10
        });
        stage.done();
    }, "spicyextract burns both zombies");
});
