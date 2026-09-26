/**
 * 十字劈 / crosschop —— 可执行设计说明。
 *
 * 一句话：一只只会十字劈的精灵贴到对手身上，双臂交叉举过头顶，两道劈击先后落在面前同一个锁定交叉点上。
 * 必然事实：本招被劈出过、目标受到过至少一次伤害（第一劈必然先落下）。
 * 第二劈是否接上（目标是否离开锁定交叉点）、破势加成是否生效写进 note 供读轨迹判断。
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
        stage.note("释放时锁定面前交叉点：两劈隔 gap 刻先后沿真实武器段 trace 落下，第一劈先撞开架势；只有第二劈仍命中第一劈已劈中的同一实体才按 (1 + seam) 放大，目标侧移离开锁定交叉点、或第二刀落到旁人身上就只剩普通一劈。撞墙停在墙上。破势式的间隔与起手更久。", {
            casts: stage.casts("crosschop", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "cross chop lands within 35 s");
});
