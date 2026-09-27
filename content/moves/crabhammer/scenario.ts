/**
 * 蟹钳锤 / crabhammer —— 可执行设计说明。
 *
 * 一句话：一只只会蟹钳锤的精灵贴到对手身上，把大钳子高举过顶后沿面前垂直短弧压下，钳子真实接触到的第一个实体或地表
 * 决定落点，接触处再朝前压出一片低短前扇水花。
 * 必然事实：本招被砸出过、目标受到过伤害（正面目标吃 slam）；裂甲档位下物防真的下降，断言实际阶梯。
 * 扇面半径、掀开距离与是否砸到多个取决于体重、站位与档位，写进 note 供读轨迹判断。
 */
Smoke.scenario("crabhammer", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crawdaunt", level: 48, moves: ["crabhammer"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    // 裂甲式：命中时目标物防 −1 级是必然结果，断言实际阶梯；前摇足够长，patch 在提交前生效。
    stage.after(2, function () { stage.prefer(caster, "crabhammer", { crack: true }); });
    stage.until(800, function () {
        return stage.casts("crabhammer", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("crabhammer", caster) >= 1, "crabhammer was hoisted and brought down");
            stage.expect(stage.damageTo(foe) > 0, "the pincer slam damaged the foe");
            stage.expect(stage.stages(foe).def <= -1, "the cracking form actually broke the foe's defence");
            stage.note("钳子沿真实垂直弧逐刻 trace 压下，首个实体或地表接触点决定落点；到弧末端还没接触就向下探真实支撑，探空只在弧尖散水、不凭空出扇。正面目标吃 slam 并按 shove 被 hitDisplace 掀开，真实接触处再朝出手方向压出 shockRadius 的低短前扇水花（排除主目标、墙遮断，旁人只溅水花不复制整扇）。裂甲式在命中且原生接受时按实际级数敲裂物防；本场景单挑靶子只读正面那一砸。", {
                casts: stage.casts("crabhammer", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                defStage: stage.stages(foe).def,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the slam lands within 40 s");
});
