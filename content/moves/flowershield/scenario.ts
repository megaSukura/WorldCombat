// 鲜花防守的执行性设计说明：这是从施法者身上推开的一圈花浪，不看站位、也不分敌我。
// 场面要有站在同一圈的草属性（施法者自己就是草属性时最直接），也要有让 AI 先推花浪的威胁。
// 必然事实：施法者提交过鲜花防守；圈内的草属性施法者与伙伴身上都出现过共享身份 world_combat:status/petaled。
// 抬起几级防御、护瓣多久、扫到几个人，写进 note（私有装配读不到原生能力等级，属设计事实）。
Smoke.scenario("flowershield", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "roselia", level: 32, moves: ["flowershield"], at: [-1, 0, 0] });
    var ally = stage.pokemon({ species: "bulbasaur", level: 30, moves: [], at: [1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("garden", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("flowershield", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/petaled")
            && stage.hadMobEffect(ally, "world_combat:status/petaled");
    }, function () {
        stage.expect(stage.casts("flowershield", caster) > 0, "flowershield was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/petaled"), "the Grass caster was shielded by the wave");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/petaled"), "the Grass ally in the ring was shielded");
        stage.note("鲜花防守以自身为心一次结算，圈内所有草属性（含对手的）都被护到；防御等级随防御与瓣形、花浪半径随特攻与体型、花瓣量随特攻与等级、护瓣时长随等级与特防分别变化。具体级数与窗口属设计事实，私有装配读不到原生能力等级，留给完整装配的人工试玩。", {
            casts: stage.casts("flowershield", caster), casterHp: caster.health(), allyHp: ally.health(),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "flowershield shields the grass ring");
});
