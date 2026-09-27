/**
 * 恶梦 / nightmare 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。一只只会恶梦的耿鬼（gengar）对一只只带「跃起」、**先醒着**的呆壳兽（slowpoke）
 *   隔空盯着；呆壳兽不还手。先让它醒着：恶梦以共享睡眠身份为门槛，这时它不该被提出。
 *
 * 第一轮：给目标续上睡眠直到第一次下咒成功，随后停止外部续睡——只能靠恶梦自己的收割把睡者弄醒。
 *   必然事实：醒着时没有施放；睡着后恶梦被提交过；目标身上出现过共享的恶梦身份；睡者受到过一次恶梦收割；
 *   这一抽把它弄醒，噩梦随之结束；全程只有一次「world_combat:nightmare」来源的结算，没有多跳或补跳。
 *
 * 第二轮：重新给目标睡下，等第二次下咒成立后立刻用一记普通伤害把它提前打醒——此时倒数还没走完。
 *   必然事实：提前唤醒让第二次恶梦消散，没有再打出收割；恶梦来源的结算仍然只有第一次那一口。
 * 每口实际扣血随最大生命与双方特攻／特防变化，暴击不参与；具体数值写进 note。
 */
Smoke.scenario("nightmare", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "gengar", level: 42, moves: ["nightmare"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 26, moves: ["splash"], at: [2, 0, 0] });
    stage.noai(target);
    stage.hostile(caster, target);

    function sleepFor(ticks: number): void {
        var at = target.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:sleep " + ticks + " 0 true");
    }
    function keepAsleep(deadline: number, expectedCasts = 1): void {
        if (!target.alive() || stage.casts("nightmare", caster) >= expectedCasts || stage.tick() > deadline) return;
        sleepFor(100);
        stage.after(20, function () { keepAsleep(deadline, expectedCasts); });
    }

    stage.note("醒着时：恶梦以共享睡眠身份为门槛，这时不该被提出");
    stage.after(120, function () {
        stage.expect(stage.casts("nightmare", caster) === 0, "awake target was never cursed");
        stage.note("给目标续上一段足够长的共享睡眠，睡着之后应当开始下咒；首咒成立后停止外部续睡");
        keepAsleep(stage.tick() + 700);
        stage.until(1300, function () {
            return stage.casts("nightmare", caster) > 0 && stage.damageTo(target) > 0
                && !stage.hasMobEffect(target, "world_combat:status/sleep");
        }, function () {
            stage.expect(stage.casts("nightmare", caster) > 0, "nightmare was committed once the target slept");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/nightmare"), "the sleeper carried the shared nightmare identity");
            stage.expect(stage.damageTo(target) > 0, "the nightmare drained the sleeper's health");
            stage.expect(!stage.hasMobEffect(target, "world_combat:status/sleep"), "the drain woke the sleeping target");
            stage.expect(stage.damageEvents("world_combat:nightmare").length === 1, "the nightmare settled exactly one harvest, with no follow-up pulses");
            stage.until(80, function () { return !stage.hasMobEffect(target, "world_combat:status/nightmare"); }, function () {
                stage.expect(!stage.hasMobEffect(target, "world_combat:status/nightmare"), "waking ended the first nightmare");
                // 第二轮：重新睡下 → 等第二次下咒 → 立刻用普通伤害提前打醒。
                keepAsleep(stage.tick() + 700, 2);
                stage.until(1000, function () { return stage.casts("nightmare", caster) >= 2; }, function () {
                    stage.hurt(target, 3, "minecraft:magic", { source: caster });
                    stage.after(90, function () {
                        stage.expect(!stage.hasMobEffect(target, "world_combat:status/nightmare"), "an early wake dispersed the second nightmare");
                        stage.expect(stage.damageEvents("world_combat:nightmare").length === 1, "the early-woken nightmare never harvested");
                        stage.note("恶梦只对睡着的目标成立：黑影倒数一段，走完时按最大生命比例一次抽血并把人弄醒，恶梦随醒来结束；提前被打醒的第二次下咒直接消散，没有第二口。", {
                            casts: stage.casts("nightmare", caster),
                            nightmareReceipts: stage.damageEvents("world_combat:nightmare").length,
                            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                            targetHealth: Math.round(target.health() * 10) / 10,
                            targetAlive: target.alive(),
                            stillAsleep: stage.hasMobEffect(target, "world_combat:status/sleep"),
                            stillNightmared: stage.hasMobEffect(target, "world_combat:status/nightmare")
                        });
                        keepAsleep(stage.tick() + 700, 3);
                        stage.until(1000, function () { return stage.casts("nightmare", caster) >= 3; }, function () {
                            const at = target.position(), id = target.ref.split("/")[0];
                            stage.setPp(caster, "nightmare", 0);
                            stage.command("tp " + id + " " + (at[0] + 20) + " " + at[1] + " " + at[2]);
                            stage.after(3, function () {
                                stage.expect(!stage.hasMobEffect(target, "world_combat:status/nightmare"), "leaving range removed this nightmare's carrier");
                                stage.command("tp " + id + " " + at[0] + " " + at[1] + " " + at[2]);
                                stage.after(80, function () {
                                    stage.expect(stage.damageEvents("world_combat:nightmare").length === 1, "returning in range did not resume the old countdown");
                                    stage.note("The third curse was ended by actual separation, then the sleeping body returned. Only the first harvest exists.");
                                    stage.done();
                                });
                            });
                        }, "a third nightmare starts for the separation case");
                    });
                }, "a second nightmare was committed");
            }, "first nightmare disperses when the sleeper wakes");
        }, "nightmare drains and wakes the sleeping target");
    });
});
