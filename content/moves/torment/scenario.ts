/**
 * 无理取闹的可执行设计说明。
 *
 * 场面：一只只会无理取闹的勾魂眼对 6 格外的、只会仿效的腕力；两者都只带变化招，谁也不伤谁，
 *   取笑有一条通视直线，能安静地验证“烦躁作为真实 MobEffect 落到目标身上”。
 * 必然事实：无理取闹被提交过；烦躁（共享身份 world_combat:status/torment，实体效果 world_combat:torment_itch）
 *   作为真实 MobEffect 落到了目标身上。
 * 随机结果：命中那条直线是否被挡、实际烦躁时长写进 note 供读轨迹判断；目标之后即使想仿效，
 *   它的重复出手也会被共享动作策略按身份顶回去。
 */
Smoke.scenario("torment", function (stage) {
    var caster = stage.pokemon({ species: "Sableye", level: 38, moves: ["torment"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 30, moves: ["copycat"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: sableye(38) torment vs machop(30) copycat at 6 blocks; both carry only status moves so the jeer lands cleanly");
    stage.until(1200, function () {
        return stage.casts("torment", caster) >= 1 && stage.hadMobEffect(target, "world_combat:status/torment");
    }, function () {
        stage.expect(stage.casts("torment", caster) >= 1, "torment was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:torment_itch"), "the itch effect exists as a real MobEffect");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/torment"), "the itch carries the shared identity");
        stage.note("torment landed; afterwards the target cannot repeat its last move until it acts with another one", {
            casts: stage.casts("torment", caster), targetCasts: stage.casts("copycat", target),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "torment lands");
});
