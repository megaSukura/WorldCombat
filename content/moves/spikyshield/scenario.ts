/**
 * 尖刺防守的执行设计说明。
 *
 * 场面：一只只会尖刺防守的精灵，身边一只铁傀儡开战。威胁进入炸甲距离时 AI 会炸开藤刺甲。
 * 必然事实：本招被提交过；藤甲升起后，一次来自铁傀儡的接触攻击被挡下，而铁傀儡被接触穿刺掉了一部分体力；
 * 同一敌人在同一面藤甲里再撞一次不再被扎；反刺不会递归回到施法者身上。
 * 挡下的量、扎出的伤害、双方体力前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("spikyshield", function (stage) {
    var caster = stage.pokemon({ species: "Chesnaught", level: 45, moves: ["spikyshield"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    var contact = { category: "physical", sureHit: true, contact: true, bypassCooldown: true };
    stage.until(600, function () {
        return stage.casts("spikyshield", caster) > 0;
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("spikyshield", caster) > 0, "spikyshield was committed");
            var before = stage.damageTo(caster);
            stage.hurt(caster, 6, "minecraft:mob_attack", { source: foe, metadata: contact });
            stage.after(4, function () {
                var afterFirst = stage.damageTo(caster), pricked = stage.damageTo(foe);
                stage.expect(afterFirst <= before + 0.001, "the thorn shield blocked the contact blow");
                stage.expect(pricked > 0, "the contact pricked the attacker for damage");
                stage.hurt(caster, 6, "minecraft:mob_attack", { source: foe, metadata: contact });
                stage.after(4, function () {
                    stage.expect(stage.damageTo(caster) <= afterFirst + 0.001, "the second contact was blocked too");
                    stage.expect(Math.abs(stage.damageTo(foe) - pricked) < 0.001, "the same attacker is pricked only once per shield");
                    stage.expect(stage.damageTo(caster) === 0, "the reflect did not recurse back into the caster");
                    stage.note("spikyshield blocks contacts and pricks each attacker once; a second contact in the same shield does not re-prick and the reflect does not bounce back. The pool math and the status ward live in the shared guard rule.",
                        { before: before, after: afterFirst, attackerDamage: pricked, casterHealth: caster.health() });
                    stage.done();
                });
            });
        });
    }, "spikyshield raised");
});
