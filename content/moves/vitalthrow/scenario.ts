/**
 * 借力摔 / vitalthrow —— 可执行设计说明。
 *
 * 一句话：站定等对手先动，等它扑进来的一刻借它的冲劲把它摔出去；摔得慢所以在对手之后，抓的是近身一瞬所以躲不掉。
 *
 * 场面：一只摔跤手对两格外的对手（已经在抓握圈里，让它站定接人）。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、目标受过借力摔伤害。是否接到扑击（借力加成）与暴击写进 note 供读轨迹判断。
 */
Smoke.scenario("vitalthrow", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machamp", level: 42, moves: ["vitalthrow"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "golem", level: 25, moves: ["tackle"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("vitalthrow", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(100, function () {
            stage.expect(stage.casts("vitalthrow", caster) >= 1, "caster committed vital throw");
            stage.expect(stage.damageTo(foe) > 0, "vital throw dealt damage to the foe");
            stage.note("whether the throw caught the foe mid-attack (momentum bonus), crit, and flung distance are positional/random", {
                casts: stage.casts("vitalthrow", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAt: foe.position().map(function (n: number) { return Math.round(n * 10) / 10; }),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "vital throw lands on a foe within 60 s");
});
