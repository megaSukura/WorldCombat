/**
 * 吞下的可执行设计说明。
 *
 * 场面：一只同时会蓄力与吞下的溶食兽（Gulpin）与一只卫道士（vindicator）相隔 8 格、铺了石质地面的场地上开战；夜晚、天晴。
 *   卫道士打得动这只厚血的溶食兽，才能把它压到兑现线以下，让吞下真的被放出来。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/swallowed；
 *   吞下之前必须攒过层，因此也出现过 world_combat:status/stockpile。
 * 具体回了几口、回了多少、层数被消费掉没有，写进 note 供读轨迹判断。
 */
Smoke.scenario("swallow", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 用夜晚，让近战对手能持续打到溶食兽，把血量压在兑现线附近。
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gulpin", level: 30, moves: ["stockpile", "swallow"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:vindicator", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1500, function () {
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
    }, "swallow is cast");
});
