/**
 * 连斩 / furycutter —— 可执行设计说明。
 *
 * 一句话：一趟比一趟多一倍刀数的连斩，命中就攒层、落空或换招就归零。
 *
 * 场面：一只只会连斩的飞天螳螂（40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者身上出现过共享连斩身份，
 * 且第二趟连斩真的比第一趟多结算了刀数（同样两趟的总伤害高于「每趟单刀」之和）。
 * 具体的层数进度与刀数写进 note。
 */
Smoke.scenario("furycutter", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 40, moves: ["furycutter"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("furycutter", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        // Let the second flurry finish its extra cuts (and the streak settle) before reading the totals.
        stage.after(50, function () {
            stage.expect(stage.casts("furycutter", caster) >= 2, "caster committed fury cutter at least twice");
            stage.expect(stage.damageTo(foe) > 0, "fury cutter dealt damage to the foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/furycutter"), "the consecutive-hit identity landed on the caster");
            stage.expect(stage.damageTo(foe) > 34, "the chained second cast settled more cuts than a single-cut pass would");
            stage.note("cuts = 1 / 2 / 4 for streak stages 0 / 1 / 2; a whiff or any other committed move clears the streak", {
                casts: stage.casts("furycutter", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fury cutter chains within 30 s");
});
