/**
 * 高速旋转 / rapidspin —— 可执行设计说明。
 *
 * 一句话：原地旋成一圈风，甩脱缠在身上的束缚、扫开身边的人，并给自己提速一级。
 *
 * 场面：石头地面、晴夜。一只只会「高速旋转」的 donphan（技能表只给这一招，AI 就只会用它）对上一只僵尸——
 *   僵尸会自己贴上来，正好检验这记贴地扫场；夜里不会被日照影响。
 * 必然事实：高速旋转被提交过、施法者对僵尸造成过伤害；因为真的扫中了，速度等级抬起（+1）。
 *   甩脱束缚本场没有可甩的束缚（smoke API 读不到 rooted／partiallytrapped／leechseed 的布置接口用于断言）；
 *   随机量（伤害、暴击）写进 note；墙后不扫与空转不提速由人工试玩确认。
 */
Smoke.scenario("rapidspin", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var roller = stage.pokemon({ species: "donphan", level: 45, moves: ["rapidspin"], at: [-3, 0, 0], properties: "nature=adamant" });
    var bag = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(roller, bag);
    stage.until(1500, function () {
        return stage.casts("rapidspin", roller) >= 1 && stage.damageTo(bag) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("rapidspin", roller) >= 1, "donphan committed rapid spin");
            stage.expect(stage.damageTo(bag) > 0, "the spin dealt damage to the target");
            stage.expect((stage.stages(roller)["spe"] || 0) >= 1, "catching a target raised the user's Speed stage");
            stage.note("rapid spin is a self-centred ring that first cures rooted / partiallytrapped / trapped / leechseed on the user, checks a real wall before each victim, then sweeps nearby enemies and raises its own Speed stage only because it actually caught one. Wall occlusion, empty-spin no-Speed and the cure itself need a manual playtest (or a staged bind, which the smoke API cannot apply). Random parts: damage roll and crit.", {
                casts: stage.casts("rapidspin", roller),
                dealt: Math.round(stage.damageBy(roller) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(bag) * 10) / 10,
                speedStage: stage.stages(roller)["spe"] || 0,
                travelled: Math.round(stage.travelled(roller) * 10) / 10,
                targetAlive: bag.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "rapid spin lands on the target within 75 s");
});
