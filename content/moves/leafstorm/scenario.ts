/**
 * 飞叶风暴 / leafstorm 的可执行设计说明。
 *
 * 场面：只会飞叶风暴的蜥蜴王（Sceptile，特攻向）对一只被点住、不会还手的铁傀儡，相隔 7 格，晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（风柱真实卷到它、叶刃炸开）。
 * 命中率（原生 90 折成风柱写偏）、自身特攻下降的具体级数、卷叶式穿过几个敌人，都写进 note 供读轨迹判断。
 */
Smoke.scenario("leafstorm", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sceptile", level: 50, moves: ["leafstorm"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("leafstorm", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("leafstorm", caster) > 0, "leaf storm was committed");
        stage.expect(stage.damageTo(foe) > 0, "the leaf vortex cut the foe");
        stage.note("风暴命中、自身特攻下降级数与卷叶式穿过几个敌人属于设计事实；私有装配没有读取原生特攻等级的断言原语，由完整装配的人工试玩核对", {
            casts: stage.casts("leafstorm", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            changedBlocks: stage.changedBlocks(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "leaf storm lands within 70 s");
});
