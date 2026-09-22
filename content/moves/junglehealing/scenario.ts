/** 丛林治疗：治疗并净化身边友方，原有自然地面提供加成；藤蔓与嫩芽由粒子表现。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("junglehealing", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:grass_block");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "zarude", level: 32, moves: ["junglehealing"], at: [0, 0, 0], status: "burn" });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [2, 0, 0], status: "poison" });
    stage.team("jungle", [caster, ally]);

    var casterLow = 0, allyLow = 0;
    stage.after(8, function () {
        var at = caster.position(), best = caster.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(best * 0.4)) + " minecraft:generic");
        var mate = ally.position(), mateMax = ally.health();
        stage.command("execute positioned " + mate[0] + " " + mate[1] + " " + mate[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(mateMax * 0.4)) + " minecraft:generic");
        stage.after(4, function () { casterLow = caster.health(); allyLow = ally.health(); });
    });

    stage.until(900, function () {
        return casterLow > 0 && stage.casts("junglehealing", caster) >= 1 && ally.health() > allyLow
            && !stage.hasMobEffect(ally, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("junglehealing", caster) >= 1, "the caster called the jungle");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the ally carried poison before the vines");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "the vines cleansed the ally's poison");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/burn"), "the vines cleansed the caster's own burn");
        stage.note("丛林治疗为范围内友方回血并清除主异常；原有自然地面仍影响回复与半径，藤蔓和嫩芽由表现承载。", {
            casterCasts: stage.casts("junglehealing", caster),
            casterLow: Math.round(casterLow * 10) / 10,
            casterNow: Math.round(caster.health() * 10) / 10,
            allyLow: Math.round(allyLow * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            casterBurnNow: stage.hasMobEffect(caster, "world_combat:status/burn"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            tick: stage.tick()
        });
        stage.done();
    }, "jungle healing restores and cleanses the pair within 45 s");
});
