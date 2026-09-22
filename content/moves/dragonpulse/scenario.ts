/**
 * 龙之波动的可执行设计说明。
 *
 * 场面：一只会龙之波动的刺龙王（Kingdra，50 级），正前方 7 格与 10 格各站一只只带跃起、不还手的果然翁，
 * 排在同一条直线上——用来读贯通式能不能把一列上的第二个目标也扫到。
 * 必然事实：本招被提交过；至少一个目标受到过伤害。
 * 是否穿透到第二个目标、伤害数值、波何时到头，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonpulse", function (stage) {
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Kingdra", level: 50, moves: ["dragonpulse"], at: [-3, 0, 0] });
    var near = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [4, 0, 0] });
    var far = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [7, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("dragonpulse", caster) > 0 && (stage.damageTo(near) + stage.damageTo(far) > 0);
    }, function () {
        // 波以约 0.85 格/刻前进，等一小段让它走完 10 格再读第二个目标。
        stage.after(30, function () {
            stage.expect(stage.casts("dragonpulse", caster) > 0, "dragonpulse was committed");
            stage.expect(stage.damageTo(near) + stage.damageTo(far) > 0, "the dragon pulse dealt damage");
            stage.note("龙之波动沿直线持续前进：贯通式按 pierce 穿过成排目标，连锁式在第一个目标处收束。"
                + "这一场用默认贯通式，读刺龙王在 50 级（reach 约 11、pierce 约 3）能否把第二个目标也扫到。",
                { casts: stage.casts("dragonpulse", caster), onNear: Math.round(stage.damageTo(near) * 10) / 10, onFar: Math.round(stage.damageTo(far) * 10) / 10,
                    piercedFar: stage.damageTo(far) > 0, nearAlive: near.alive(), farAlive: far.alive(), casterTravelled: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        });
    }, "dragon pulse lands");
});
