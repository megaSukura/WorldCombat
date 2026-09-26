/**
 * 祈愿 / Wish —— 可执行设计说明。
 *
 * 一句话：点一块空地放下愿星，延迟落下后只为站在落点圈里的友善战斗者回血；AI 在自身或伙伴生命低于
 *   ai.healBelow（默认 0.7）时出手，并把落点放在需要救助者脚下那块地面上。所以场面必须先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会祈愿的皮皮（clefairy，会学这招；技能表只给这一招）站在一侧；16 格外站一只
 *   只会撞击的小拉达。施术者由服务端 /damage 分小步压到自身最大生命约 50%，跨过祈愿阈值。敌人不宣战、也不
 *   在近处，避免施术者在兑现前被打断或走出落点圈。
 *
 * 必然事实：施术者提交过祈愿；落点就在施术者脚下那块地面，施术者留在原地，所以愿星兑现后必定进圈回血。愿星
 *   悬停与落下的视觉、落点圈半径、被推出圈而落空都属于位置与时机的随机项，写进 note 而不作断言。
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
            stage.expect(caster.health() > woundedAt + 5, "the wish star landed in the ring under the caster and restored it above the wound floor");
            stage.note("愿星落点是所选地面，兑现时只按落点圈筛选：施术者留在圈里才会回血，走远或换人都会改变受益者。落点圈半径（约 2.6-4 格）、悬停/下落视觉、分享档的比例摊薄与圈外落空属于位置与设计的随机项。本场景只有施术者一人且原地不动，愿星落点就在它脚下，所以进圈回血必然发生。", {
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
