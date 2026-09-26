/**
 * 气场之翼 / esperwing —— 可执行设计说明。
 *
 * 一句话：气场上翼，一对粉色气翼从两侧向前扫出切开正面，同一瞬给自己写入一档速度并留下气翼余韵；暴击率高一档。
 *
 * 场面：一只只会气场之翼的勇士雄鹰（50 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者身上出现过共享身份 world_combat:status/esperwing 的余韵。
 * 暴击与否是随机的，写进 note。
 */
Smoke.scenario("esperwing", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "braviary", level: 50, moves: ["esperwing"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("esperwing", caster) >= 1 && stage.damageTo(foe) > 0 && stage.hadMobEffect(caster, "world_combat:status/esperwing");
    }, function () {
        stage.expect(stage.casts("esperwing", caster) >= 1, "caster committed esperwing");
        stage.expect(stage.damageTo(foe) > 0, "esperwing dealt damage to the foe");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/esperwing"), "esperwing left its speed aura on the caster");
        stage.note("the left wing sweeps first then the right wing, each target hit at most once; the speed boost is written only after the second wing lands, and the aura window is the visible read. Critical hits come from the native critRatio 2 roll", {
            casts: stage.casts("esperwing", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            aura: stage.hasMobEffect(caster, "world_combat:status/esperwing"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "esperwing lands within 30 s");
});
