/**
 * 点到为止 / falseswipe —— 可执行设计说明。
 *
 * 一句话：沿身前一条窄缝划一记极准的浅切，无论多沉，目标至少留下 1 HP。
 *
 * 场面：一只只会点到为止的飞天螳螂（40 级）对一只被点住、已被预先打到低血的铁傀儡——这一刀若不被留手，必然是致命一击。
 * 断言只取必然事实：这招被提交过、目标受过伤害、目标在挨刀后仍然活着。伤害被截停是概率无关的设计行为。
 */
Smoke.scenario("falseswipe", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 40, moves: ["falseswipe"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.command("damage @e[type=minecraft:iron_golem,distance=..8,limit=1] 92 minecraft:generic");
    stage.until(600, function () {
        return stage.casts("falseswipe", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("falseswipe", caster) >= 1, "caster committed falseswipe");
        stage.expect(stage.damageTo(foe) > 0, "falseswipe dealt damage to the foe");
        stage.expect(foe.alive(), "the sparing cut left the target standing");
        stage.note("the target is pre-damaged to ~8 HP; this lethal cut is capped by the per-hit native health floor (minimumHealth 1), so it survives at 1 HP", {
            casts: stage.casts("falseswipe", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeHealth: Math.round(foe.health() * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "falseswipe cast within 30 s");
});
