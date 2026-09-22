/** 花疗：立即治疗选定友方；青草场地加成读取目标状态，撒花与绽放承载反馈。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("floralhealing", function (stage) {
    stage.fill([-2, -1, -6], [10, -1, 6], "minecraft:dirt");
    stage.fill([-2, 0, -6], [10, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "comfey", level: 30, moves: ["floralhealing"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [4, 0, 0] });
    stage.team("floral", [caster, ally]);

    var injuredAt = 0;
    stage.after(8, function () {
        var at = ally.position(), maximum = ally.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.5)) + " minecraft:generic");
        stage.after(4, function () { injuredAt = ally.health(); });
    });

    stage.until(1200, function () {
        return injuredAt > 0 && stage.casts("floralhealing", caster) >= 1 && ally.health() > injuredAt;
    }, function () {
        stage.expect(stage.casts("floralhealing", caster) >= 1, "the caster bloomed on the wounded ally");
        stage.expect(ally.health() > injuredAt, "the flower restored the ally on the spot");
        stage.note("花疗在伙伴身上当场结算回复。青草场地加成读取目标的共享状态；本场景验证基础治疗，花瓣、绽放和落花由表现承载。", {
            casterCasts: stage.casts("floralhealing", caster),
            allyInjured: Math.round(injuredAt * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            allyAlive: ally.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "floral healing reaches the wounded ally within 60 s");
});
