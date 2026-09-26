// 治愈之愿的可执行设计说明：这是最后一手——把命换成伙伴的一次重生。
// 必然事实：施术者提交过治愈之愿并倒下；留在原地的愿星兑现，把又伤又病的同队伙伴治好（生命高于压血后的最低值）；
//   站在愿望范围内的满状态伙伴不会被消耗（愿星跳过它，留给真正需要的人）。
// 愿望半径、回复比例、停留与愿光量取决于体型、等级、特攻与特防，写进 note。
Smoke.scenario("healingwish", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会治愈之愿的沙奈朵（被压到约一成半，跨过献身阈值）；同队皮卡丘中毒半血、技能表为空；另有一只满状态
    // 且干净的伊布站得更近，用来读出愿星只认「真正需要」的接收者。
    var caster = stage.pokemon({ species: "gardevoir", level: 55, moves: ["healingwish"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [1, 0, 0], status: "poison" });
    var bystander = stage.pokemon({ species: "eevee", level: 20, moves: [], at: [0.5, 0, 0.5] });
    stage.team("wish", [caster, ally, bystander]);

    function wound(actor: Smoke.Actor, fraction: number): void {
        var at = actor.position(), maximum = actor.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * fraction)) + " minecraft:magic");
    }
    var allyWoundedAt = 0, bystanderAt = 0;
    stage.after(8, function () {
        wound(ally, 0.5);
        stage.after(4, function () {
            allyWoundedAt = ally.health();
            bystanderAt = bystander.health();
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
        stage.expect(bystander.health() >= bystanderAt - 0.05, "the full-health bystander did not consume the wish");
        stage.note("愿望是 WorldBodies 持久实体（独立于施法动作），落在施法者倒下的地方，只由真正受伤或带异常的第一名友善伙伴领取——满状态又干净的伙伴站在愿望里也不会消耗它。愿望把领取者整口治好并洗掉全部主异常，随后散去。半径随体型与等级、回复随特攻、停留随特防与等级，广愿／专愿在半径、停留与回复之间取舍；准备期先标出可接者与愿星落点，附近没有合格接收者时许愿者不会倒下（忠实原生 ifHit），等待期间把伙伴带离愿望即落空，都留给完整装配的人工试玩。", {
            casterCasts: stage.casts("healingwish", caster),
            casterAlive: caster.alive(),
            allyWounded: Math.round(allyWoundedAt * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            allyPoisonEver: stage.hadMobEffect(ally, "world_combat:status/poison"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            bystanderBefore: Math.round(bystanderAt * 10) / 10,
            bystanderNow: Math.round(bystander.health() * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "healing wish sacrifices the user and revives the teammate within 45 s");
});
