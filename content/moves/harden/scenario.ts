/**
 * 变硬 的可执行设计说明。
 *
 * 场面：一只只会「变硬」的铁甲蛹（20 级）与一只僵尸隔开 4 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先结晶。僵尸本身单次拳击通常不够重，晶壳应稳稳磨掉每一击；这里再注入可控的确定打击来读阈值行为。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/harden 的晶壳窗口；
 *   提交后经过若干刻，晶壳窗口仍在（等级窗口与削伤池绑定同一个最终 carrier，不会在下一拍就失效），
 *   且防御等级仍留在公共能力阶梯上；两次低于真实阈值的小击不累计碎壳，单次达到真实阈值即碎，
 *   碎裂后护层与抬起的防御一起消失。
 */
Smoke.scenario("harden", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "metapod", level: 20, moves: ["harden"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("harden", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/harden");
    }, function () {
        stage.expect(stage.casts("harden", caster) > 0, "harden was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/harden"), "the crystal shell carried the shared identity");
        stage.after(30, function () {
            stage.expect(stage.hasMobEffect(caster, "world_combat:status/harden"),
                "the shell window stays up after the opening ticks (bound to the final carrier)");
            stage.expect((stage.stages(caster).def || 0) >= 1, "the Defence gain stays on the shared ladder while the shell holds");
            var max = stage.attribute(caster, "minecraft:generic.max_health");
            if (!(max > 0)) max = 60;
            var small = Math.max(1, max * 0.02), hit = { source: foe, metadata: { category: "physical", sureHit: true } };
            stage.hurt(caster, small, "minecraft:generic", hit);
            stage.after(25, function () {
                stage.hurt(caster, small, "minecraft:generic", hit);
                stage.after(25, function () {
                    stage.expect(stage.hasMobEffect(caster, "world_combat:status/harden"),
                        "separate hits under the real threshold do not crack the shell");
                    // 阈值按原始来伤比较：这一击的原始值超过最大生命的 crack 比例，必定碎壳。
                    stage.hurt(caster, max * 0.6, "minecraft:generic", hit);
                    stage.after(2, function () {
                        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/harden"),
                            "a single hit at the real threshold shatters the shell");
                        stage.expect((stage.stages(caster).def || 0) <= 0,
                            "the shattered shell takes its Defence window down with it");
                        stage.note("the crack presentation sits on the real contact side and its short crack lines grow with the raw incoming amount; two separate small hits stay under the declared threshold and only a single hit at that raw threshold shatters the shell, after which the guard and its Defence window are gone.", {
                            casts: stage.casts("harden", caster),
                            maxHealth: max,
                            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                            alive: caster.alive()
                        });
                        stage.done();
                    });
                });
            });
        });
    }, "harden engages");
});
