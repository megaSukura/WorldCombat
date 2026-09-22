/**
 * 花疗 / Floral Healing —— 可执行设计说明。
 *
 * 一句话：撒一路花瓣到受伤的伙伴身上、当场绽开并回血；AI 只在伙伴生命低于 ai.healBelow（默认 0.7）时动用，
 *   且只送给别人、不送自己。
 *
 * 场面：晴天白天。在伙伴脚下铺一层土（`minecraft:dirt`）并把上方一格登记为空气，只会花疗的花疗环
 *   （comfey，30 级学会这招；技能表只给这一招）与一只同队的皮卡丘（pikachu）相隔 4 格，附近没有敌人；
 *   皮卡丘被一次性压到自身最大生命约 50%，跨过救助阈值。
 *
 * 必然事实：施术者提交过花疗；伙伴的生命必定高于压血后的最低值（当场兑现）；并且伙伴脚下真的种下了花
 *   （`changedBlocks` 里出现由空气变成花的格子）。
 *   回复比例、花瓣数、绽开半径与落花数取决于亲密度、身高、特攻与等级，写进 note；
 *   青草场地的加倍需要另一个施法者的青草场地，留给完整装配的人工试玩。
 */
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
        var bloomed = stage.changedBlocks().some(function (change) { return /flower|petal|dandelion|poppy|cornflower|azure/.test(change.after); });
        stage.expect(bloomed, "floral healing planted flowers at the ally's feet");
        stage.note("花疗在伙伴身上当场结算回复，并在脚下的土里种下几朵短命的花（world.terrain 租借、linger，到期原方块回来）。回复比例随亲密度、花瓣随身高、绽开半径随特攻、落花随等级变化；青草场地加成读的是目标身上的共享身份 world_combat:status/grassyterrain（站在草上的活体才带），本场景没有青草场地，回复只有基础段，加倍与暖金层留给完整装配的人工试玩。", {
            casterCasts: stage.casts("floralhealing", caster),
            allyInjured: Math.round(injuredAt * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            flowersPlanted: stage.changedBlocks().filter(function (change) { return /flower|petal|dandelion|poppy|cornflower|azure/.test(change.after); }).length,
            allyAlive: ally.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "floral healing reaches the wounded ally within 60 s");
});
