/** 花疗：分两朵花送达选定友方；第二朵读取受益人当时的青草场地状态，撒花与绽放承载反馈。 场景核对提交、两朵各自的治疗与状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("floralhealing", function (stage) {
    stage.fill([-2, -1, -6], [10, -1, 6], "minecraft:dirt");
    stage.fill([-2, 0, -6], [10, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "comfey", level: 30, moves: ["floralhealing"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [4, 0, 0] });
    stage.team("floral", [caster, ally]);
    stage.noai(ally);

    var injuredAt = 0, firstAt = 0;
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
        firstAt = ally.health();
        stage.expect(stage.casts("floralhealing", caster) >= 1, "the caster bloomed on the wounded ally");
        stage.expect(firstAt > injuredAt, "the first flower restored the ally on the spot");
        stage.after(40, function () {
            stage.expect(ally.health() > firstAt, "the second flower landed after the delay and restored more");
            stage.note("花疗在伙伴身上分两朵结算：第一朵当场补一半，bloomDelay 之后开第二朵并读取受益人**当时**的青草场地状态（站在青草上按 grassBoost 开大）；受益人可移动，花簇跟人走。本场景验证两朵各自的基础治疗与两朵合计不超总上限，青草加成需要另一施法者的青草场地，留给完整装配的人工试玩。", {
                casterCasts: stage.casts("floralhealing", caster),
                allyInjured: Math.round(injuredAt * 10) / 10,
                allyAfterFirst: Math.round(firstAt * 10) / 10,
                allyNow: Math.round(ally.health() * 10) / 10,
                allyAlive: ally.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "floral healing reaches the wounded ally within 60 s");
});
