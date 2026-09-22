// 治愈之愿的可执行设计说明：这是最后一手——把命换成伙伴的一次重生。
// 必然事实：施术者提交过治愈之愿并倒下；留在原地的愿星兑现，把又伤又病的同队伙伴治好（生命高于压血后的最低值）。
// 愿望半径、回复比例、停留与愿光量取决于体型、等级、特攻与特防，写进 note。
Smoke.scenario("healingwish", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会治愈之愿的沙奈朵（被压到约一成半，跨过献身阈值）与同队皮卡丘（中毒、半血、技能表为空）贴身站位，无敌人。
    var caster = stage.pokemon({ species: "gardevoir", level: 55, moves: ["healingwish"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [1, 0, 0], status: "poison" });
    stage.team("wish", [caster, ally]);

    function wound(actor: Smoke.Actor, fraction: number): void {
        var at = actor.position(), maximum = actor.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * fraction)) + " minecraft:magic");
    }
    var allyWoundedAt = 0;
    stage.after(8, function () {
        wound(ally, 0.5);
        stage.after(4, function () {
            allyWoundedAt = ally.health();
            wound(caster, 0.84);
        });
    });

    stage.until(900, function () {
        return allyWoundedAt > 0 && stage.casts("healingwish", caster) >= 1 && !caster.alive()
            && ally.health() > allyWoundedAt && !stage.hasMobEffect(ally, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("healingwish", caster) >= 1, "the cornered gardevoir committed healing wish");
        stage.expect(!caster.alive(), "the user gave up its life");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the teammate had carried the poison identity");
        stage.expect(ally.health() > allyWoundedAt, "the wish star delivered and restored the wounded teammate");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "the wish cleansed the teammate's poison");
        stage.note("愿望是 WorldBodies 持久实体（独立于施法动作），落在施法者倒下的地方，第一个进入愿望半径内、又伤又病的友善伙伴被整口治好并洗掉全部主异常，随后愿望散去。半径随体型与等级、回复随特攻、停留随特防与等级，广愿／专愿在半径、停留与回复之间取舍；附近没有可接收伙伴时许愿者不会倒下（忠实原生 ifHit），等待期间把伙伴带离愿望即落空，都留给完整装配的人工试玩。", {
            casterCasts: stage.casts("healingwish", caster),
            casterAlive: caster.alive(),
            allyWounded: Math.round(allyWoundedAt * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            allyPoisonEver: stage.hadMobEffect(ally, "world_combat:status/poison"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            tick: stage.tick()
        });
        stage.done();
    }, "healing wish sacrifices the user and revives the teammate within 45 s");
});
