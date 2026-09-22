/**
 * 劈开 / slash —— 可执行设计说明。
 *
 * 一句话：站定举刃，沿身前窄走廊压下一记重劈，命中处闪出要害标记；暴击率高一档。
 *
 * 场面：一只只会劈开的猫鼬斩（45 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击是否出现是随机的，写进 note。
 */
Smoke.scenario("slash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 45, moves: ["slash"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("slash", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("slash", caster) >= 1, "caster committed slash");
        stage.expect(stage.damageTo(foe) > 0, "slash dealt damage to the foe");
        stage.note("critical hits come from the native critRatio 2 roll and are shown by the crit moment", {
            casts: stage.casts("slash", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "slash lands within 30 s");
});
