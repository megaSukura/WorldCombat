/**
 * 热沙大地 / scorchingsands 的可执行设计说明。
 *
 * 场面：站在整片沙地上、只会热沙大地的穿山鼠（Sandshrew）对六格外的卡比兽（Snorlax，只会跃起、不会还手），
 * 晴天；施法者用闷烧式（hearth），落点在卡比兽所在的天然沙面上。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（落点炸开）；地表**没有**被替成砂岩（不再改材质）。
 * 灼伤（30% 起）、湿身加成与逐格热区都是概率与位置相关的随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("scorchingsands", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:sand");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sandshrew", level: 40, moves: ["scorchingsands"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.after(5, function () { stage.prefer(caster, "scorchingsands", { hearth: true }); });
    stage.watch([-9, -2, -9], [9, 1, 9]);
    stage.until(1400, function () {
        return stage.casts("scorchingsands", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        var crust = stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:sandstone"; });
        stage.expect(stage.casts("scorchingsands", caster) > 0, "sandshrew committed scorching sands");
        stage.expect(stage.damageTo(foe) > 0, "the scorching sand burst struck the foe");
        stage.expect(crust.length === 0, "the ground was not replaced with sandstone");
        stage.note("smoulder heats natural sand cells without changing the material; burn and the wet bonus are random",
            { casts: stage.casts("scorchingsands", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
              burned: stage.hadMobEffect(foe, "world_combat:status/burn"), sandstone: crust.length, foeAlive: foe.alive() });
        stage.done();
    }, "scorching sands bursts on a foe and heats natural sand without replacing it");
});
