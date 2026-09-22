/**
 * 暗袭要害 / nightslash —— 可执行设计说明。
 *
 * 一句话：站定牵出一缕影线，顺着影线在对手身上切一道暗痕；对手正忙着别人时这一刀更重，暴击率高一档。
 *
 * 场面：一只只会暗袭要害的猫鼬斩（45 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击与「空门加成」是否触发是随机的／看场面，写进 note。
 */
Smoke.scenario("nightslash", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 45, moves: ["nightslash"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("nightslash", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("nightslash", caster) >= 1, "caster committed nightslash");
        stage.expect(stage.damageTo(foe) > 0, "nightslash dealt damage to the foe");
        stage.note("critical hits come from the native critRatio 2 roll; the opening bonus needs the target to be attacking someone else, which the NoAI golem never does here", {
            casts: stage.casts("nightslash", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "nightslash lands within 30 s");
});
