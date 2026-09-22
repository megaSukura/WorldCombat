// 净化的可执行设计说明：这是一口「给又伤又病的伙伴」的单点救助，抽走异常的同时给自己回一口。
// 必然事实：施术者提交过净化；伙伴的中毒身份消失（被真正抽走）；施术者生命高于压血后的最低值（回复到手）。
// 回复比例基于目标最大生命、抽引粒子量与选中范围取决于特攻/特防/体型/等级，写进 note。
Smoke.scenario("purify", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会净化的拳海参（自己也被压到半血，用来读出回复）；同队皮卡丘带着中毒、同样被压到半血、技能表为空。
    var caster = stage.pokemon({ species: "pyukumuku", level: 34, moves: ["purify"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [3, 0, 0], status: "poison" });
    stage.team("purify", [caster, ally]);
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [9, 0, 0] });
    stage.hostile(caster, foe);

    function wound(actor: Smoke.Actor, fraction: number): void {
        var at = actor.position(), maximum = actor.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * fraction)) + " minecraft:magic");
    }
    var casterWoundedAt = 0;
    stage.after(8, function () {
        wound(ally, 0.5);
        wound(caster, 0.5);
        stage.after(4, function () { casterWoundedAt = caster.health(); });
    });

    stage.until(800, function () {
        return casterWoundedAt > 0 && stage.casts("purify", caster) >= 1
            && !stage.hasMobEffect(ally, "world_combat:status/poison") && caster.health() > casterWoundedAt;
    }, function () {
        stage.expect(stage.casts("purify", caster) >= 1, "the pyukumuku committed purify on the afflicted teammate");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the teammate had carried the poison identity");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "purify drew the poison out of the teammate");
        stage.expect(caster.health() > casterWoundedAt, "the user gained life from the drawn-out affliction");
        stage.note("抽取以落点 captureRadius 内最近的带异常战斗者为目标（伙伴或对手都行），回复量 = 目标最大生命 × heal 比例；抽完若目标身上再无主异常，异常身份随之消失并同步原生状态。密度、范围与回复随特攻/特防/体型/等级变化；深引／轻引在回复与手感之间取舍。落空（附近无带异常目标）与对对手施放的取舍留给完整装配的人工试玩。", {
            casterCasts: stage.casts("purify", caster),
            allyPoisonEver: stage.hadMobEffect(ally, "world_combat:status/poison"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            casterWounded: Math.round(casterWoundedAt * 10) / 10,
            casterNow: Math.round(caster.health() * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "purify draws the poison out and heals the user within 40 s");
});
