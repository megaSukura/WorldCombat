/**
 * 绑紧 / bind —— 可执行设计说明。
 *
 * 场面：一只只会绑紧的草系精灵（Bellsprout），面对 3 格外一只 Zigzagoon；两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标挨到过伤害；目标身上出现过 `partiallytrapped` 身份；目标的移动速度属性被压下去。
 * 勒了几次、有没有被扯断、暴击与否，都是随机/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("bind", function (stage) {
    stage.time("day");
    var caster = stage.pokemon({ species: "Bellsprout", level: 30, moves: ["bind"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Zigzagoon", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("bind") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("bind") > 0, "bind was committed");
            stage.expect(stage.damageTo(foe) > 0, "the cinch dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/partiallytrapped"), "the target was tethered");
            stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the rope slowed the tethered target");
            stage.note("how many cinches landed and whether the rope snapped are positional/random", {
                casts: stage.casts("bind"),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                speed: [baseSpeed, Math.round(stage.attribute(foe, "minecraft:generic.movement_speed") * 100) / 100],
                foeAlive: foe.alive(),
                casterAlive: caster.alive(),
                gap: Math.round(Math.sqrt(Math.pow(foe.position()[0] - caster.position()[0], 2) + Math.pow(foe.position()[2] - caster.position()[2], 2)) * 10) / 10
            });
            stage.done();
        });
    }, "bind ties the target");
});
