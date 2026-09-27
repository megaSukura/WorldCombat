/**
 * 连斩 / furycutter —— 可执行设计说明。
 *
 * 一句话：一趟比一趟多一倍刀数的连斩，每一刀左右交替扫过身前一短段弧；命中就攒层、落空就归零、别招实际提交才清层。
 *
 * 场面：一只只会连斩的飞天螳螂（40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 选取为 `kind: "aim"`，AI 仍按仇恨推荐这个敌人；每一趟的挥刀方向在提交时锁定，整趟的刀都绕它左右交替扫。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者身上出现过共享连斩身份，
 * 且两趟连斩真的按段数结算（第一趟 1 刀 + 第二趟 2 刀 → 至少 3 次伤害回执），而不是一次矩形闪烁。
 * 具体的刀数进度、暴击与逐刀时序写进 note。
 *
 * 这一版每刀的两个弧端各自被墙裁到第一堵墙（取消 0.6 穿墙下限），判定厚度只包住可见短刃；
 * 相邻刀起点相隔正好 `gap` 刻；刃上聚气由真实层数载体自身的托管效果拥有，载体消失即结束。
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
            stage.expect(stage.hits(foe, true) >= 3, "the chained passes settled real per-cut hits (1 cut then 2 cuts)");
            stage.note("cuts = 1 / 2 / 4 for streak stages 0 / 1 / 2; each cut is an alternating short sweep whose two arc ends are clipped to the first wall (no 0.6 pierce floor) with a thickness matching the visible blade; adjacent cut starts are exactly gap ticks apart; the gathering aura is owned by the layer carrier and ends whenever that carrier leaves", {
                casts: stage.casts("furycutter", caster),
                hits: stage.hits(foe, true),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fury cutter chains within 30 s");
});
