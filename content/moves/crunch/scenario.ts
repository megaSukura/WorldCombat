/**
 * 咬碎 / crunch —— 可执行设计说明。
 *
 * 一句话：扑上去咬住，牙关研磨一小会儿；只有全程保持真实咬合才结算第二段伤害，伤害落地后才有机会降防御、留破防缺口。
 *
 * 场面：一只只会咬碎的圈圈熊（45 级）对一只只会跃起、厚血不还手的卡比兽（60 级）。厚血目标让它活到
 * 研磨结束，破防那一步才有机会真的发生。断言只取必然事实：这招被提交过、目标受到过伤害。
 * 咬塌是否掷出、研磨的具体时长与扑空与否是概率/站位结果，写进 note 供读轨迹判断；
 * 「目标中途脱开则提前松口」需要移动目标才看得到，静态靶写进 note 说明即可。
 */
Smoke.scenario("crunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ursaring", level: 45, moves: ["crunch"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 60, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("crunch", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("crunch", caster) >= 2, "caster committed crunch at least twice");
            stage.expect(stage.damageTo(foe) > 0, "crunch dealt damage to the foe");
            stage.note("the bite lands when the pounce connects; the grind then rechecks real body gap and line of sight every 2 ticks and only settles the second hit while still latched. The crush roll follows that landed second hit.", {
                casts: stage.casts("crunch", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                guardbroken: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "crunch lands on a foe within range");
});
