/**
 * 大地掌控 / geomancy 的可执行设计说明。
 *
 * 场面：一只只会「大地掌控」的沙奈朵与一只弱小的小拉达拉开 12 格开战，脚下是石头地。蓄力期间立定不动，
 * 所以 AI 只在对手隔着安全距离时先扎地。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/geomancy 的蓄力窗口；
 *   脚下的石头地被地纹替换过（world.terrain 的 linger 租约，到期原方块回来）。
 * 真实能力等级、蓄力时长与是否被控住取消，写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("geomancy", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 50, moves: ["geomancy"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("geomancy", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/geomancy")
            && stage.changedBlocks().length > 0;
    }, function () {
        stage.expect(stage.casts("geomancy", caster) > 0, "the geomancy was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/geomancy"), "the charging window carried the shared identity");
        stage.expect(stage.changedBlocks().length > 0, "the ground ring changed the blocks under the caster");
        var changed = stage.changedBlocks();
        stage.note("the real Sp. Atk/Sp. Def/Speed stages and whether the second beat was cancelled by sleep or freeze are design facts read here; the private assembly has no reader for native stat stages", {
            casts: stage.casts("geomancy", caster),
            changed: changed.length,
            sample: changed.slice(0, 4),
            foeCasts: stage.casts("tackle", foe),
            casterAlive: caster.alive(), casterHp: caster.health()
        });
        stage.done();
    }, "geomancy is cast and marks the ground within 80 s");
});
