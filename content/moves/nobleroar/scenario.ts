/**
 * 战吼的可执行设计说明。
 *
 * 场面：一只只会战吼的炎狮（Pyroar）与两只相邻的僵尸（相隔 2 格）隔 5 格开战；僵尸会走近，站在同一侧的锥形里。
 * 必然事实：本招被提交过；至少一只僵尸的物攻属性下降、并挂上共享身份 world_combat:status/cowed。
 * 具体吼到几只、两只是否都在锥内、掉的是 1 级还是 2 级，随站位与配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("nobleroar", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Pyroar", level: 40, moves: ["nobleroar"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [5, 0, -1] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [5, 0, 1] });
    var attackA = stage.attribute(foeA, "minecraft:generic.attack_damage");
    var attackB = stage.attribute(foeB, "minecraft:generic.attack_damage");
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("nobleroar", caster) > 0
            && (stage.hadMobEffect(foeA, "world_combat:status/cowed") || stage.hadMobEffect(foeB, "world_combat:status/cowed"))
            && (stage.attribute(foeA, "minecraft:generic.attack_damage") < attackA - 0.001
                || stage.attribute(foeB, "minecraft:generic.attack_damage") < attackB - 0.001);
    }, function () {
        stage.expect(stage.casts("nobleroar", caster) > 0, "nobleroar was committed");
        stage.expect(stage.attribute(foeA, "minecraft:generic.attack_damage") < attackA - 0.001
            || stage.attribute(foeB, "minecraft:generic.attack_damage") < attackB - 0.001,
            "at least one target's Attack fell");
        stage.expect(stage.hadMobEffect(foeA, "world_combat:status/cowed") || stage.hadMobEffect(foeB, "world_combat:status/cowed"),
            "a cowed identity landed on a target");
        stage.note("nobleroar observations", {
            casts: stage.casts("nobleroar", caster),
            attackA: [attackA, stage.attribute(foeA, "minecraft:generic.attack_damage")],
            attackB: [attackB, stage.attribute(foeB, "minecraft:generic.attack_damage")],
            cowedA: stage.hadMobEffect(foeA, "world_combat:status/cowed"),
            cowedB: stage.hadMobEffect(foeB, "world_combat:status/cowed"),
            moved: Math.round((stage.travelled(foeA) + stage.travelled(foeB)) * 10) / 10
        });
        stage.done();
    }, "nobleroar cowed the zombies");
});
