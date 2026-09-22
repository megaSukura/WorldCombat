/**
 * 硬撑的可执行设计说明。
 *
 * 场面：一只带着灼伤的豪力对 4 格外的卡比兽（没有招式、站着）开战。带着异常是这招翻倍的条件，
 * 因此用户开场就带 burn，让“带伤硬顶”的倍率这条链真的被走到；距离在射程外，AI 会先走近再冲撞。
 * 必然事实：本招被提交过；交手期间卡比兽受到过硬撑的伤害。
 * 命中、异常镜射与变本加厉的反噬写进 note，供读轨迹判断。
 */
Smoke.scenario("facade", function (stage) {
    var user = stage.pokemon({ species: "Machop", level: 40, moves: ["facade"], at: [-3, 0, 0], status: "burn" });
    var target = stage.pokemon({ species: "Snorlax", level: 40, moves: [], at: [2, 0, 0] });
    stage.hostile(user, target);
    stage.until(800, function () {
        return stage.casts("facade") > 0 && stage.damageBy(user) > 0;
    }, function () {
        stage.expect(stage.casts("facade") > 0, "facade was committed");
        stage.expect(stage.damageBy(user) > 0, "facade dealt damage");
        stage.note("facade observations", {
            casts: stage.casts("facade"), onTarget: Math.round(stage.damageTo(target) * 10) / 10,
            userHurt: Math.round(stage.damageTo(user) * 10) / 10,
            burning: stage.hasMobEffect(user, "world_combat:status/burn"),
            moved: Math.round(stage.travelled(user) * 10) / 10
        });
        stage.done();
    }, "facade lands");
});
