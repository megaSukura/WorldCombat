/**
 * 震级 / magnitude —— 可执行设计说明。
 *
 * 一句话：沉身压地，地面在原地横颤；震级当场掷定，圈里站在地上的敌人各挨一记、被颠被推，
 * 震级够大时正在出手的人会被抖断动作。
 *
 * 场面：体重很大的隆隆石带着这一招，站在两只原版铁傀儡旁边——两者都站在地上、不会逃跑，
 * 逼出「一圈站在地上的人都吃」的场面。铁傀儡血厚，用来核对这条跨对象的效果，也保证它们
 * 一直留在震幅圈里，让必然事实（至少一个挨到伤害）稳定成立。
 *
 * 断言只取必然事实：这招被放过、至少一只站在地上的敌人挨到伤害。
 * 掷出的震级、上颠与踉跄多远、有没有抖断动作、暴击写进 note 供读轨迹判断——
 * 「威力随震级变化」与「够大就打断」正是这招的设计事实。
 */
Smoke.scenario("magnitude", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["magnitude"], at: [0, 0, 0] });
    var heavyA = stage.mob({ type: "minecraft:iron_golem", at: [2.0, 0, 0] });
    var heavyB = stage.mob({ type: "minecraft:iron_golem", at: [1.8, 0, 1.6] });
    stage.hostile(caster, heavyA);
    stage.hostile(caster, heavyB);
    stage.until(900, function () {
        return stage.casts("magnitude", caster) >= 1 && (stage.damageTo(heavyA) > 0 || stage.damageTo(heavyB) > 0);
    }, function () {
        stage.after(12, function () {
            stage.expect(stage.casts("magnitude", caster) >= 1, "golem committed magnitude");
            stage.expect(stage.damageTo(heavyA) > 0 || stage.damageTo(heavyB) > 0, "the quake dealt damage to a grounded foe");
            stage.note("震级每次当场掷定（原生 5/10/20/30/20/10/5 分布，深源式整体 +1），实际威力按震级缩放；上颠很小、踉跄一点点；震级 ≥ fracture 时被打到的目标动作被中断（本场景无法直接观测，留待试玩）。暴击与命中几个随局面变化", {
                casts: stage.casts("magnitude", caster),
                heavyADamage: Math.round(stage.damageTo(heavyA) * 10) / 10,
                heavyBDamage: Math.round(stage.damageTo(heavyB) * 10) / 10,
                heavyATravelled: Math.round(stage.travelled(heavyA) * 10) / 10
            });
            stage.done();
        });
    }, "magnitude quakes a grounded foe within 45 s");
});
