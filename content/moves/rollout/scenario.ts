/**
 * 滚动 / rollout —— 可执行设计说明。
 *
 * 一句话：一趟接一趟地缩成石球真实滚进目标，每真实撞中一趟下一趟翻倍变重；撞墙或落空就归零。
 *
 * 场面：一只只会滚动的隆隆岩（40 级）对一只被点住、不会还手的僵尸（敌对生物，威胁感一直在，靶子不动）。
 * 断言只取必然事实：这招被提交过多次（`stage.casts`）、目标受过伤害、施法者身上出现过共享连滚身份。
 * 层数爬升、某趟是否撞墙/擦偏、有没有接满 5 趟、石球滚了多远，都是随机/时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("rollout", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["rollout"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:240}],Health:240f}");
    stage.until(1200, function () {
        return stage.casts("rollout", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("rollout", caster) >= 2, "caster committed rollout at least twice");
            stage.expect(stage.damageTo(foe) > 0, "rollout dealt damage to the foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/rollout"), "the roll chain identity landed on the caster");
            stage.note("the ball rolls tick by tick with a per-tick turn cap (10 deg light / 6 deg heavy, less with weight); only a real first body contact rolls accuracy, a hit pushes and bounces back from the real contact point, a wall collapses the chain", {
                casts: stage.casts("rollout", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                chained: stage.hadMobEffect(caster, "world_combat:status/rollout"),
                stillChaining: stage.hasMobEffect(caster, "world_combat:status/rollout"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "rollout chains within 60 s");
});
