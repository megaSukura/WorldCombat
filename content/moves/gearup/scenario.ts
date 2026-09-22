// 辅助齿轮的执行性设计说明：它只把动力传给带正电／负电特性的己方，所以场上必须有一个这样的伙伴。
// 必然事实：施法者提交过辅助齿轮；贴身的正电施法者自己与负电伙伴身上都出现过共享身份 world_combat:status/geared。
// 传了几级物攻与特攻、运转多久，写进 note（私有装配读不到原生能力等级，属设计事实）。
Smoke.scenario("gearup", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "klinklang", level: 34, moves: ["gearup"], ability: "plus", at: [-0.5, 0, 0] });
    var ally = stage.pokemon({ species: "minun", level: 30, moves: [], ability: "minus", at: [0.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("drive", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("gearup", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/geared");
    }, function () {
        stage.expect(stage.casts("gearup", caster) > 0, "gearup was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/geared"), "the Plus caster itself was geared");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/geared"), "the adjacent Minus ally was geared");
        stage.note("辅助齿轮在一次结算里把动力传给贴身一圈内现行特性为正电或负电的己方（含施法者自己）；攻击等级随物攻与传动、特攻等级随特攻与传动、齿链半径随体型与速度、运转时长随等级与物攻分别变化。具体级数与时长属设计事实，私有装配读不到原生能力等级，留给完整装配的人工试玩。", {
            casts: stage.casts("gearup", caster), casterHp: caster.health(), allyHp: ally.health(),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "gearup drives both plus/minus allies");
});
