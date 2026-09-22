/**
 * 电光束 / electroshot 的可执行设计说明。
 *
 * 场面：白天下雨、石面平地。先让天气落定（雨量是插值生效的），再放出只会电光束的 Archaludon（L45）
 *   与睡眠的 Slowpoke（L30、技能表只给撞击），两者相隔 10 格——已在射程内，不必先接近。
 *   雨天直接取电、跳过聚电，所以「开战到提交的间隔很短」是可以断言的必然事实（晴天要站定聚电约 26 刻）。
 *
 * 必然事实：本招被提交过；电矛对目标造成了伤害；开战到提交的间隔很短（雨天即时发射，原生规则）。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、追踪转向是否修正了走位。
 *   「特攻 +1」落在原生能力等级阶梯而不是 MobEffect，舞台的 hadMobEffect 读不到，只从伤害与轨迹间接判断。
 */
Smoke.scenario("electroshot", function (stage) {
    stage.weather("rain");
    stage.time("day");
    // Let the rain finish interpolating in before the fighters appear, so the cast really exercises the rain rule.
    stage.after(60, function () {
        var caster = stage.pokemon({ species: "archaludon", level: 45, moves: ["electroshot"], at: [-5, 0, 0] });
        // A stationary punching bag: sleeping, so a homing lance lands on it reliably.
        var target = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [5, 0, 0] });
        stage.hostile(caster, target);
        var hostileAt = stage.tick(), committedAt = -1;
        stage.until(1200, function () {
            if (committedAt < 0 && stage.casts("electroshot", caster) >= 1) committedAt = stage.tick();
            return stage.casts("electroshot", caster) >= 1 && stage.damageTo(target) > 0;
        }, function () {
            stage.expect(stage.casts("electroshot", caster) >= 1, "archaludon committed electro shot");
            stage.expect(stage.damageTo(target) > 0, "the lance damaged the target");
            // Rain skips the gathering (native rule): commit must follow the start almost at once.
            stage.expect(committedAt - hostileAt <= 14, "the lance was fired at once in the rain (no gathering)");
            stage.note("rain was fully in before the fighters appeared, so this exercises the instant branch. Random here: damage roll and crit, whether the slowpoke survives, and how much the homing had to steer. The +SpA stage lives on the native ability ladder, not a MobEffect, so the stage cannot read it directly.", {
                casts: stage.casts("electroshot", caster),
                ticksToCommit: committedAt - hostileAt,
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                targetHealth: Math.round(target.health() * 10) / 10,
                targetAlive: target.alive()
            });
            stage.done();
        }, "electro shot fires in the rain within 60 s");
    });
});
