/**
 * 雪崩 / avalanche —— 可执行设计说明。
 *
 * 一句话：带着一路挨打积起来的「被打懵」积伤，朝对手滚碾过去；这一记翻倍，命中后崩开一圈并把落点铺成积雪。
 *
 * 场面：一只只带这一招的冰系物攻手对一只血厚、关掉 AI 的对手；开场后脚本直接给施法者挂上本单元的共享身份
 *   world_combat:status/battered（等同被对手打过后的积伤），AI 带着它起手。
 * 断言：本招被滚出过、僵尸吃到过伤害、施法者带着共享身份 battered（消费方按身份读到）、
 *   僵尸也被这一崩记上了 battered、落点地面出现过变化（积雪租借）。
 * 「积伤由挨打自动叠上」的那条链靠 world_combat:damage_applied，见报告说明。
 */
Smoke.scenario("avalanche", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "mamoswine", level: 48, moves: ["avalanche"], at: [-1.5, 0, 0], properties: "nature=adamant" });
    // 铁傀儡血厚、关掉 AI（不逃不还手）：扛得住这一崩，好让「被崩到的人也记上 battered」与落点积雪都能被读到。
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(user, foe);
    stage.after(10, function () { stage.command("data merge entity @e[type=minecraft:iron_golem] {NoAI:1b}"); });
    stage.after(20, function () { stage.command("effect give @e[type=cobblemon:pokemon] world_combat:avalanche_battered 200 1"); });
    stage.until(1600, function () {
        return stage.casts("avalanche", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("avalanche", user) > 0, "mamoswine committed avalanche");
            stage.expect(stage.damageTo(foe) > 0, "the avalanche dealt damage");
            stage.expect(stage.hadMobEffect(user, "world_combat:status/battered"), "the caster carried the battered grudge identity");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/battered"), "the crash marked the foe as battered too");
            stage.expect(changed.length > 0, "the landing left frost on the ground");
            stage.note("battered was staged by command to fix the doubled trigger; the frost lease and the area crash are read from changedBlocks and the trace", {
                casts: stage.casts("avalanche", user),
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
