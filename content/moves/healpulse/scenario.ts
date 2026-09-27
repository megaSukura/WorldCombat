/**
 * 治愈波动 / Heal Pulse —— 可执行设计说明。
 *
 * 一句话：把一圈治愈波动推给受伤的伙伴；AI 只在伙伴生命低于 ai.healBelow（默认 0.75）时动用，且只送给别人、不送自己。
 *
 * 场面：晴天白天、开阔平地。只会治愈波动的幸福蛋（chansey，28 级学会这招；技能表只给这一招）与一只同队的
 *   皮卡丘（pikachu）相隔 4 格，附近没有敌人；皮卡丘被一次性压到自身最大生命约 50%，跨过救助阈值。
 *
 * 必然事实：施术者提交过治愈波动；波动沿瞄准线飞到伙伴身上兑现回复，所以伙伴的生命必定高于压血后的最低值。
 *   飞行时间（距离 ÷ 波动速度）、回复比例与波动半径取决于距离、速度、特攻、亲密度与身高，写进 note。
 */
Smoke.scenario("healpulse", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "chansey", level: 32, moves: ["healpulse"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [4, 0, 0] });
    stage.team("pulse", [caster, ally]);
    stage.noai(ally);

    var injuredAt = 0;
    stage.after(8, function () {
        var at = ally.position(), maximum = ally.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.5)) + " minecraft:generic");
        stage.after(4, function () { injuredAt = ally.health(); });
    });

    stage.until(1200, function () {
        return injuredAt > 0 && stage.casts("healpulse", caster) >= 1 && ally.health() > injuredAt;
    }, function () {
        stage.expect(stage.casts("healpulse", caster) >= 1, "the caster sent a healing wave to the wounded ally");
        stage.expect(ally.health() > injuredAt, "the wave reached the ally and restored it");
        stage.note("治愈波动从施法者身前推出，波前每刻按 pulseSpeed 向伙伴当前位置推进、以有限速率转向，贴上伙伴身体的一刻才结算回复；总路程在出招时按距离定下（保留原 3..72 刻的行程预算），途中撞墙就在墙前落空。回复随特攻与亲密度、波动半径随身高与特攻、光点随特攻；超载／轻吐在回复厚度与飞行速度之间取舍。AI 用起手 + 距离÷速度 估到达延时，急危且到得快的伙伴优先。等待期间伙伴被打倒或跑光行程而落空、以及墙截断，留给完整装配的人工试玩。", {
            casterCasts: stage.casts("healpulse", caster),
            allyInjured: Math.round(injuredAt * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            allyAlive: ally.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "heal pulse reaches the wounded ally within 60 s");
});
