/**
 * 大地掌控 / geomancy 的可执行设计说明。
 *
 * 场面：一只只会「大地掌控」的沙奈朵与一只弱小的小拉达拉开 12 格开战，脚下是石头地。蓄力期间立定不动，
 * 所以 AI 只在对手隔着安全距离时先扎地。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/geomancy 的蓄力窗口；
 *   第二拍把特攻、特防、速度各抬到 +2；地纹是纯表现，脚下的石头地没有被替换。
 * 真实蓄力时长、以及被睡冻／窗口提前清除时是否取消，写进 note 供读轨迹判断。
 */
Smoke.scenario("geomancy", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 50, moves: ["geomancy"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [9, 0, 0] });
    stage.hostile(caster, foe);
    // 记录施术者脚下的地面区域：本招只该留下粒子地纹，不该替换任何方块。
    stage.watch([-5, -1, -5], [0, 0, 0]);
    stage.until(1600, function () {
        var stages = stage.stages(caster);
        return stage.casts("geomancy", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/geomancy")
            && stages.spa >= 2 && stages.spd >= 2 && stages.spe >= 2;
    }, function () {
        var stages = stage.stages(caster);
        var changed = stage.changedBlocks();
        stage.expect(stage.casts("geomancy", caster) > 0, "the geomancy was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/geomancy"), "the charging window carried the shared identity");
        stage.expect(stages.spa >= 2 && stages.spd >= 2 && stages.spe >= 2, "the second beat raised Sp. Atk, Sp. Def and Speed");
        stage.expect(changed.length === 0, "the ground rune left every block under the caster untouched");
        stage.note("the real channel length and whether sleep/freeze or an early-cleared window cancelled the second beat are design facts read here", {
            casts: stage.casts("geomancy", caster),
            stages: stages,
            changedBlocks: changed.length,
            foeCasts: stage.casts("tackle", foe),
            casterAlive: caster.alive(), casterHp: caster.health()
        });
        stage.done();
    }, "geomancy channels and grants the three boosts within 80 s");
});
