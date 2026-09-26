/**
 * 三旋击 / tripleaxel —— 可执行设计说明。
 *
 * 一句话：滑着身子旋踢三脚，每中一脚下一脚更重，任一脚落空或扇形里没人这串就停。
 *
 * 场面：只会三旋击的玛狃拉（50 级，原生真实学习者）对一只被点住、不会还手的僵尸（敌对生物，威胁感一直在，
 * 不会回手）出手；硬石平地。断言只取必然事实：这招被提交过、目标受到过伤害。实际踢出几脚、第几脚落空、
 * 滑步是否被墙挡住、横扫式是否扫到第二个目标，都是随机/选择结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("tripleaxel", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "weavile", level: 50, moves: ["tripleaxel"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:240}],Health:240f}");
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("tripleaxel", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 20;
    }, function () {
        stage.expect(stage.casts("tripleaxel", caster) >= 1, "caster committed triple axel");
        stage.expect(stage.damageTo(foe) > 0, "triple axel dealt damage to the foe");
        stage.note("each of the three kicks rolls its own accuracy (default 90%); between kicks the body slides along a side arc and each kick faces that arc's real tangent, so the body position and facing genuinely change", {
            casts: stage.casts("tripleaxel", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "triple axel lands within 60 s");
});
