/**
 * 十字劈 / crosschop —— 可执行设计说明。
 *
 * 一句话：一只只会十字劈的精灵贴到对手身上，双臂交叉举过头顶，两道劈击先后落在同一个点上。
 * 必然事实：本招被劈出过、目标受到过至少一次伤害（第一劈必然先落下）。
 * 第二劈是否接上（受目标站位与两劈间隔影响）、破势加成是否生效写进 note 供读轨迹判断。
 */
Smoke.scenario("crosschop", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machamp", level: 45, moves: ["crosschop"], at: [-1, 0, 0] });
    // 不动的厚实靶子：站在短射程里，两劈都有机会落下。
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("crosschop", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("crosschop", caster) >= 1, "caster committed cross chop");
        stage.expect(stage.damageTo(foe) > 0, "cross chop dealt damage to the foe");
        stage.note("两劈隔 gap 刻先后结算：第一劈必然落下并撞开架势，第二劈要在短射程里还在才接得上并按 (1 + seam) 放大。破势式的间隔与起手更久。", {
            casts: stage.casts("crosschop", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "cross chop lands within 35 s");
});
