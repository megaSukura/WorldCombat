/**
 * 精神突进 / psychoboost 的可执行设计说明。
 *
 * 场面：只会精神突进的胡地（Alakazam，特攻向）对一只被点住、不会还手的铁傀儡，相隔 7 格，晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（念力环合拢后内爆）。
 * 命中率（原生 90）、自身特攻下降级、视线遮断时散环属于设计事实，写进 note 供读轨迹判断。
 */
Smoke.scenario("psychoboost", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "alakazam", level: 50, moves: ["psychoboost"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("psychoboost", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psychoboost", caster) > 0, "psycho boost was committed");
        stage.expect(stage.damageTo(foe) > 0, "the implosion reached the foe");
        stage.note("念力收拢延迟、自身特攻下降级与视线遮断时散环属于设计事实；由完整装配的人工试玩核对", {
            casts: stage.casts("psychoboost", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "psycho boost lands within 70 s");
});
