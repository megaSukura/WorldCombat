/**
 * 地裂 / fissure 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会地裂的穿山鼠（sandshrew，40 级）对一只只会「跃起」的低级鲤鱼王
 *   （magikarp，12 级），相距 4 格；等级差让张口延迟压到最短，平坦地面又保证裂缝线路通视。
 *
 * 必然事实：本招被提交过；鲤鱼王受到过地裂的固定伤害；结算后地面方块没有被替换（只剩会散去的短裂纹）。
 *   命中与否不写死：目标若在 `mark` 刻内离开落点或离地就会落空，写进 note 供读轨迹判断。
 */
Smoke.scenario("fissure", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "sandshrew", level: 40, moves: ["fissure"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 12, moves: ["splash"], at: [0, 0, 0] });
    // 目标脚下保持连续真实地表；裂纹只作表现。
    stage.block([0, -1, 0], "minecraft:grass_block");

    stage.until(360, function () { return caster.alive() && foe.alive(); }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("fissure", caster) > 0 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("fissure", caster) > 0, "地裂被放出来了");
            stage.expect(stage.damageTo(foe) <= 170, "一次裂口保持有限预算");
            stage.expect(stage.hits(caster) === 1, "裂口只结算最近一个接地身体");
            stage.expect(stage.damageTo(foe) > 0, "落点张口后对贴地目标造成了固定伤害");
            stage.expect(stage.changedBlocks().length === 0, "裂缝只留下表现，原地表方块保持");
            stage.note("命中取决于目标是否还站在落点内、且仍贴住那层地面；裂缝只沿连续真实地面推进，张口延迟随等级差缩短。",
                { casts: stage.casts("fissure", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10,
                  changed: stage.changedBlocks().length });
            stage.done();
        }, "地裂命中");
    }, "双方存活");
});
