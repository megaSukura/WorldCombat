// 磁场操控的执行性设计说明：它只咬带正电／负电特性的己方，所以场上必须有一个这样的伙伴才有意义。
// 必然事实：施法者提交过磁场操控；站在磁场里的正电伙伴身上出现过共享身份 world_combat:status/magnetized。
// 场里抬了几级防御与特防、磁场多久，写进 note（私有装配读不到原生能力等级，属设计事实）。
Smoke.scenario("magneticflux", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "magnemite", level: 32, moves: ["magneticflux"], ability: "sturdy", at: [-1, 0, 0] });
    var ally = stage.pokemon({ species: "plusle", level: 30, moves: [], ability: "plus", at: [1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("magnet", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("magneticflux", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/magnetized");
    }, function () {
        stage.expect(stage.casts("magneticflux", caster) > 0, "magneticflux was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/magnetized"),
            "the Plus ally in the field was magnetized");
        stage.note("磁场操控以施法点为心立起一片磁场：只有站在场里、且现行特性为正电或负电的己方才被咬住（施法者自己没有该特性时不会被咬）。防御等级随防御与极性、特防等级随特防与极性、磁场半径随特攻与体型、时长随等级与特防分别变化；本场施法者的特性 sturdy 不属正负电，只有 plusle 被咬住。具体级数与时长属设计事实，私有装配读不到原生能力等级，留给完整装配的人工试玩。", {
            casts: stage.casts("magneticflux", caster), casterHp: caster.health(), allyHp: ally.health(),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "magneticflux links the plus ally");
});
