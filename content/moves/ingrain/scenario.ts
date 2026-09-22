/**
 * 扎根的可执行设计说明。
 *
 * 场面：一只只会扎根的走路草（Oddish）与一只卫道士（vindicator）在一座四面围起的石室里开战；夜晚、天晴。
 *   围栏保证施法者始终站在被记录过的石地上（changedBlocks 只认 stage 布置过的格子），
 *   卫道士追得上这只慢慢爬的走路草，才能把血量压到扎根血量以下，让扎根真的被放出来。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/ingrain；脚下出现过 rooted_dirt。
 * 是否真的钉住（travelled 在扎根后不再增长）、每拍回了多少、根须被清掉没有，写进 note 供读轨迹判断。
 */
Smoke.scenario("ingrain", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 四面围栏（4 格高），把施法者留在被记录的石地上。
    stage.fill([-9, 0, -7], [9, 4, -7], "minecraft:stone");
    stage.fill([-9, 0, 7], [9, 4, 7], "minecraft:stone");
    stage.fill([-9, 0, -7], [-9, 4, 7], "minecraft:stone");
    stage.fill([9, 0, -7], [9, 4, 7], "minecraft:stone");
    // 用夜晚，让近战对手能真正打到施法者，把血量压到扎根血量以下。
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Oddish", level: 30, moves: ["ingrain"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:vindicator", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("ingrain", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/ingrain")
            && stage.changedBlocks().some(function (b) { return b.after === "minecraft:rooted_dirt"; });
    }, function () {
        stage.expect(stage.casts("ingrain", caster) > 0, "ingrain was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ingrain"), "the caster carried the shared ingrain identity");
        stage.expect(stage.changedBlocks().some(function (b) { return b.after === "minecraft:rooted_dirt"; }),
            "roots turned the ground into rooted dirt");
        stage.note("ingrain observations", {
            casts: stage.casts("ingrain", caster),
            rootedTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            health: Math.round(caster.health() * 10) / 10,
            hurt: Math.round(stage.damageTo(caster) * 10) / 10,
            changed: stage.changedBlocks().length
        });
        stage.done();
    }, "ingrain is cast");
});
