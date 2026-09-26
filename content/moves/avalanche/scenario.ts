/**
 * 雪崩 / avalanche —— 可执行设计说明。
 *
 * 一句话：站定把身前积雪倾倒成一股贴地的宽雪体，沿瞄准方向塌滑；雪面触及的敌人只伤一次，滑过的最后一段留下残雪。
 *
 * 场面：一只只带这一招的冰系物攻手对一只血厚、关掉 AI 的对手；开场后脚本直接给施术者挂上本单元的共享身份
 *   world_combat:status/battered（等同被对手打过后的积伤），AI 带着它起手。战场是平铺的石头地面，雪体能顺地滑过。
 * 断言：本招被滑出过、铁傀儡吃到过伤害、施术者带着共享身份 battered（消费方按身份读到）、
 *   普通目标不会自己获得积伤身份、每名目标最多每施放吃一记（不会逐段重扣）、落点地面出现过变化（残雪租借）。
 * 「积伤由挨打自动叠上」的那条链靠 world_combat:damage_applied，见报告说明。
 */
Smoke.scenario("avalanche", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "mamoswine", level: 48, moves: ["avalanche"], at: [-1.5, 0, 0], properties: "nature=adamant" });
    // 静止的铁傀儡用于观察雪面的触击与落点残雪。
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(user, foe);
    stage.after(10, function () { stage.command("data merge entity @e[type=minecraft:iron_golem] {NoAI:1b}"); });
    stage.after(20, function () { stage.command("effect give @e[type=cobblemon:pokemon] world_combat:avalanche_battered 200 1"); });
    stage.until(1600, function () {
        return stage.casts("avalanche", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            var changed = stage.changedBlocks();
            var casts = stage.casts("avalanche", user);
            var hits = stage.hits(foe, true);
            stage.expect(casts > 0, "mamoswine committed avalanche");
            stage.expect(stage.damageTo(foe) > 0, "the avalanche dealt damage");
            stage.expect(hits <= casts, "each enemy is touched at most once per cast, not once per segment");
            stage.expect(stage.hadMobEffect(user, "world_combat:status/battered"), "the caster carried the battered grudge identity");
            stage.expect(!stage.hadMobEffect(foe, "world_combat:status/battered"), "an ordinary target does not acquire avalanche's passive counter");
            stage.expect(changed.length > 0, "the slide left frost on the traversed ground");
            stage.note("battered was staged by command to fix the doubled trigger; the frost lease and the single touch are read from changedBlocks and the damage receipts", {
                casts: casts,
                hits: hits,
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                taken: Math.round(stage.damageTo(user) * 10) / 10,
                changedBlocks: changed.length,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "avalanche lands on the target within 30 s");
});
