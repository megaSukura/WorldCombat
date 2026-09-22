/**
 * 生长的可执行设计说明。
 *
 * 场面：一只只会生长的走路草（Oddish）与一只僵尸相隔 8 格、铺了石质地面的场地上开战；天晴、白天，阳光门槛成立。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/grown；脚下出现过 moss_block 草皮。
 * 阳光是否真的把双攻从 +1 拔到 +2、草皮具体铺了几格，写进 note 供读轨迹判断。
 */
Smoke.scenario("growth", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Oddish", level: 30, moves: ["growth"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("growth", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/grown")
            && stage.changedBlocks().some(function (b) { return b.after === "minecraft:moss_block"; });
    }, function () {
        stage.expect(stage.casts("growth", caster) > 0, "growth was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/grown"), "the caster carried the shared grown identity");
        stage.expect(stage.changedBlocks().some(function (b) { return b.after === "minecraft:moss_block"; }),
            "turf was laid around the caster");
        stage.note("growth observations", {
            casts: stage.casts("growth", caster),
            grown: stage.hadMobEffect(caster, "world_combat:status/grown"),
            changed: stage.changedBlocks().length,
            health: Math.round(caster.health() * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "growth is cast");
});
