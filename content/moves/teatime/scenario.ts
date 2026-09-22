/** 茶会：范围内敌友各自吃掉携带的树果；杯盘与热气承载开席反馈。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("teatime", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:grass_block");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "polteageist", level: 34, moves: ["teatime"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "pikachu", level: 30, moves: [], item: "cobblemon:sitrus_berry", at: [0, 0, 0] });
    stage.hostile(caster, foe);

    var foeLow = 0;
    stage.after(8, function () {
        var at = foe.position(), max = foe.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(max * 0.5)) + " minecraft:generic");
        stage.after(4, function () { foeLow = foe.health(); });
    });

    stage.until(900, function () {
        return foeLow > 0 && stage.casts("teatime", caster) >= 1 && foe.health() > foeLow;
    }, function () {
        stage.expect(stage.casts("teatime", caster) >= 1, "the caster held a tea party");
        stage.expect(foe.health() > foeLow, "the foe's held Berry was eaten and healed it on the spot");
        stage.note("茶会以选定点为心，圈内敌友各自吃掉携带树果并结算；杯盘和热气由现有表现承载。", {
            casterCasts: stage.casts("teatime", caster),
            foeLow: Math.round(foeLow * 10) / 10,
            foeNow: Math.round(foe.health() * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "teatime strips and triggers the foe's Berry within 45 s");
});
