/**
 * 流星群 / dracometeor 的可执行设计说明。
 *
 * 场面：只会流星群的三首恶龙（Hydreigon，特攻向）对一只被点住、不会还手的铁傀儡，相隔 8 格，晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（陨石垂直砸到落点炸开）。
 * 命中率（原生 90）、自身特攻下降级数、坑与流星式的散布属于设计事实，写进 note 供读轨迹判断。
 */
Smoke.scenario("dracometeor", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hydreigon", level: 50, moves: ["dracometeor"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("dracometeor", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("dracometeor", caster) > 0, "draco meteor was committed");
        stage.expect(stage.damageTo(foe) > 0, "a comet crashed onto the foe");
        stage.note("陨石落点、坑与自身特攻下降级数属于设计事实；由完整装配的人工试玩核对", {
            casts: stage.casts("dracometeor", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            changedBlocks: stage.changedBlocks(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "draco meteor lands within 70 s");
});
