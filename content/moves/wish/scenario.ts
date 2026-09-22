/**
 * 祈愿 / Wish —— 可执行设计说明。
 *
 * 一句话：在还撑得住的时候把愿星送上高空，延迟落下后为自己回血；AI 只在自身生命低于 ai.healBelow（默认 0.7）
 *   时才许愿。所以场面必须先把施术者压到阈值以下，它才会动用这招。
 *
 * 场面：晴天白天、开阔平地。只会祈愿的皮皮（clefairy，会学这招；技能表只给这一招）站在一侧；16 格外站一只
 *   只会撞击的小拉达。施术者由服务端 /damage 分小步压到自身最大生命约 50%，跨过祈愿阈值。敌人不宣战、也不
 *   在近处，避免施术者在兑现前被打断或走出出生点附近。
 *
 * 必然事实：施术者提交过祈愿；愿星不受位置影响，永远兑现给施法者本人（skill.ts 里 owner 无条件结算），所以
 *   兑现后施术者生命必定高于压血后的最低值。愿星悬停与落下的视觉、落点圈半径是位置与时间的产物，写进 note。
 *
 * 共享前置：私有装配只注册本单元的动作；目标的小拉达「撞击」不在装配里，不会真正出招。愿星是 WorldBodies
 *   持久实体，舞台没有直接读它的原语，只能从施术者回血侧确认它兑现了。
 */
Smoke.scenario("wish", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "clefairy", level: 30, moves: ["wish"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [16, 0, 0] });

    // 压到 50% 并记录最低生命值；不再补刀，让愿星稳定兑现。
    var maximum = 0, settled = false, woundedAt = 0;
    function wound(): void {
        if (settled || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.5) { settled = true; woundedAt = caster.health(); return; }
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);

    stage.until(800, function () {
        return stage.casts("wish", caster) >= 1 && settled;
    }, function () {
        stage.expect(stage.casts("wish", caster) >= 1, "the wounded clefairy committed wish below its threshold");
        stage.after(200, function () {
            stage.expect(caster.health() > woundedAt + 5, "the wish star landed and restored the caster above the wound floor");
            stage.note("愿星悬停/落下的视觉与落点圈半径属于位置与时机的随机项：delayTicks 决定兑现时刻（默认约 40-80 刻），wishHeal 决定回复比例（约最大生命的 35%-65%），圈内分享是否命中伙伴取决于谁站在圈里。本场景只有施术者一人，愿星无条件兑现给 owner，因此回血必然发生。", {
                casterCasts: stage.casts("wish", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "wish is cast below the heal threshold within 40 s");
});
