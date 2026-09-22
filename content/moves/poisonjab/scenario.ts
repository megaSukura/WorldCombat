/**
 * 毒击 / poisonjab —— 可执行设计说明。
 *
 * 一句话：站定把带毒的肢体沿直线递出去，扎中直线上的第一个对手，按概率留毒并顶开它。
 *
 * 场面：一只只会毒击的阿利多斯（ariados，L35，原生学习者）对一只昏睡、不动的卡比兽（snorlax，L30），
 *   相隔 6 格——在出臂距离之外，逼 AI 先走完接近再刺；昏睡让目标留在原地，出臂判定不因走位失效；
 *   地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过深刺伤害（`stage.damageTo`）。
 * 随机量写进 note：中毒概率、暴击、以及顶开的位移都由掷签决定，供读轨迹判断。
 */
Smoke.scenario("poisonjab", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ariados", level: 35, moves: ["poisonjab"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("poisonjab", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("poisonjab", caster) >= 1, "the caster committed poison jab");
            stage.expect(stage.damageTo(foe) > 0, "poison jab dealt damage to the foe");
            stage.note("poison chance is a roll (native 30%%, shifted by attack); crit and the shove are variable too", {
                casts: stage.casts("poisonjab", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foePoisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "poison jab stabs a foe within 60 s");
});
