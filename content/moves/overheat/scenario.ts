/**
 * 过热 / overheat 的可执行设计说明。
 *
 * 场面：只会过热的喷火龙（Charizard，特攻向）对一只被点住、不会还手的铁傀儡，相隔 6 格，晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（热浪扇面扫到它）。
 * 命中率（原生 90）、点燃是概率、自身特攻下降级与内外层分伤属于设计事实，写进 note 供读轨迹判断。
 */
Smoke.scenario("overheat", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "charizard", level: 50, moves: ["overheat"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("overheat", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("overheat", caster) > 0, "overheat was committed");
        stage.expect(stage.damageTo(foe) > 0, "the heat fan caught the foe");
        stage.note("点燃、扇面是否同时扫到别人、自身特攻下降级与内外层分伤属于设计事实；由完整装配的人工试玩核对", {
            casts: stage.casts("overheat", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            changedBlocks: stage.changedBlocks(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "overheat lands within 70 s");
});
