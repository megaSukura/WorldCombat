/**
 * 吞下的可执行设计说明。
 *
 * 场面：一只同时会蓄力与吞下的溶食兽（Gulpin）与一只卫道士（vindicator）相隔 6 格、铺了石质地面的场地上开战。
 *   本单元的 scenarioFixtures 装配了 stockpile 单元，AI 才能真的攒层；卫道士被固定为不行动（noai），
 *   只作为「威胁」让溶食兽愿意蓄力；伤害由 stage.hurt 确定性注入，不靠对手随机命中——否则溶食兽会被追击到死而来不及兑现。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/swallowed；
 *   吞下之前必须攒过层，因此也出现过 world_combat:status/stockpile。具体回了多少写进 note。
 */
Smoke.scenario("swallow", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gulpin", level: 30, moves: ["stockpile", "swallow"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:vindicator", at: [3, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.after(5, function () {
        stage.prefer(caster, "stockpile", { break: "mend", ai: { hoardTo: 2, minGap: 0 } });
        stage.prefer(caster, "swallow", { ai: { cashBelow: 0.95, minLayers: 1, emergency: true } });
    });
    stage.after(700, function () {
        stage.note("swallow pre-cast diagnostics", { stockpiles: stage.casts("stockpile", caster),
            swallows: stage.casts("swallow", caster), health: Math.round(caster.health() * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10 });
    });
    stage.until(800, function () { return stage.casts("stockpile", caster) >= 1; }, function () {
        var maximum = caster.health();
        stage.hurt(caster, Math.max(1, Math.round(maximum * 0.35)), "minecraft:mob_attack", { source: foe });
        stage.after(2, function () {
            stage.until(800, function () {
                return stage.casts("swallow", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/swallowed");
            }, function () {
                stage.expect(stage.casts("swallow", caster) > 0, "swallow was committed");
                stage.expect(stage.hadMobEffect(caster, "world_combat:status/swallowed"), "the caster carried the shared swallowed identity");
                stage.expect(stage.hadMobEffect(caster, "world_combat:status/stockpile"), "the caster had stockpiled before swallowing");
                stage.note("swallow observations", {
                    stockpiles: stage.casts("stockpile", caster),
                    swallows: stage.casts("swallow", caster),
                    health: Math.round(caster.health() * 10) / 10,
                    hurt: Math.round(stage.damageTo(caster) * 10) / 10
                });
                stage.done();
            }, "swallow is cast after cashing stockpile");
        });
    }, "stockpile stores a layer");
});