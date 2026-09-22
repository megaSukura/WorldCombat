/**
 * 回复指令 / Heal Order —— 可执行设计说明。
 *
 * 一句话：掉血后召唤一队手下环绕引导，片刻后每只把一份治疗交回施法者；AI 只在自身生命低于 ai.healBelow
 *   （默认 0.75）时才动用。所以场面必须先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会回复指令的蜂女王（vespiquen，唯一正式学习者；技能表只给这一招）站在一侧，
 *   附近没有敌人。施术者由服务端 /damage 分小步压到自身最大生命约 35%，跨过疗伤阈值。
 *
 * 必然事实：施术者提交过回复指令；手下在引导结束后把治疗交回，所以结算后施术者生命必定高于压血后的最低值
 *   （至少有过一只手下幸存并交付）。手下数量、环绕轨迹与交付时刻取决于等级、速度与体型，写进 note。
 *
 * 共享前置：私有装配只注册本单元的动作；手下是 WorldBodies 持久实体，舞台没有直接读它的原语，只能从施术者
 *   回血侧确认它们交付了。
 */
Smoke.scenario("healorder", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "vespiquen", level: 30, moves: ["healorder"], at: [-3, 0, 0], properties: "gender=female" });

    // 压到 35% 并记录最低生命值；附近没有敌人，手下不会被清掉。
    var maximum = 0, settled = false, woundedAt = 0;
    function wound(): void {
        if (settled || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.35) { settled = true; woundedAt = caster.health(); return; }
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);

    stage.until(900, function () {
        return stage.casts("healorder", caster) >= 1 && settled;
    }, function () {
        stage.expect(stage.casts("healorder", caster) >= 1, "the wounded vespiquen called its retainers below the threshold");
        stage.after(240, function () {
            stage.expect(caster.health() > woundedAt + 5, "the surviving retainers paid their shares back to the caster");
            stage.note("手下面数（等级驱动，默认 3-6 只，精锐档减半）、环绕半径（体型驱动）与交付时刻（速度驱动的引导时间）是设计事实，由完整装配的人工试玩核对。本场景附近没有敌人，手下不会被清掉，全部幸存时总回复约最大生命的一半；若施术者一直站着不动，读数里还能看到它高于压血后的最低值。", {
                casterCasts: stage.casts("healorder", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "heal order is cast below the heal threshold within 45 s");
});
