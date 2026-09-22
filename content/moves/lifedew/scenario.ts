/**
 * 生命水滴 / Life Dew —— 可执行设计说明。
 *
 * 一句话：施法者脚下涌起一圈水，水环贴地铺开、扫过自己与身边的伙伴，把两人的血一起补回来。
 *
 * 场面：晴天白天、开阔平地。只会生命水滴的拉普拉斯（lapras，会学这招；技能表只给这一招）与同队皮卡丘
 *   （pikachu，技能表为空）相隔 2 格；附近没有敌人。开局把两者各压到自身最大生命约一半，跨过救助阈值。
 *
 * 必然事实：施术者提交过生命水滴；施术者与 2 格外的伙伴生命都高于压血后的最低值（水环扫到两人）。
 *   回复比例、水波半径、铺开时长、水滴数与起手/冷却取决于特攻、速度、身高与等级，写进 note。
 */
Smoke.scenario("lifedew", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:dirt");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "lapras", level: 32, moves: ["lifedew"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [2, 0, 0] });
    stage.team("dew", [caster, ally]);

    var casterLow = 0, allyLow = 0;
    stage.after(8, function () {
        var at = caster.position(), best = caster.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(best * 0.5)) + " minecraft:generic");
        var mate = ally.position(), mateMax = ally.health();
        stage.command("execute positioned " + mate[0] + " " + mate[1] + " " + mate[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(mateMax * 0.5)) + " minecraft:generic");
        stage.after(4, function () { casterLow = caster.health(); allyLow = ally.health(); });
    });

    stage.until(900, function () {
        return casterLow > 0 && stage.casts("lifedew", caster) >= 1 && caster.health() > casterLow && ally.health() > allyLow;
    }, function () {
        stage.expect(stage.casts("lifedew", caster) >= 1, "the caster sent out the healing wave");
        stage.expect(caster.health() > casterLow, "the wave restored the caster as it passed");
        stage.expect(ally.health() > allyLow, "the wave reached and restored the ally two blocks away");
        stage.note("水环从脚点向外推进，每推进一段就把圈内的自己与伙伴各回一次血（每个目标只回一次），扫完退去、不在世界里留东西。回复比例随特攻与伤势深度、水波半径随特攻与等级、铺开时长随速度、水滴随特攻与身高变化；丰沛档更足更宽但更慢。AI 以共享 world_combat:patient 感官挑伤者，够不到就先靠近。", {
            casterCasts: stage.casts("lifedew", caster),
            casterLow: Math.round(casterLow * 10) / 10,
            casterNow: Math.round(caster.health() * 10) / 10,
            allyLow: Math.round(allyLow * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            casterAlive: caster.alive(),
            allyAlive: ally.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "life dew restores the caster and the nearby ally within 45 s");
});
