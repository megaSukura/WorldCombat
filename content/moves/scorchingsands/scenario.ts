/**
 * 热沙大地 / scorchingsands 的可执行设计说明。
 *
 * 场面：站在一小片沙地上、只会热沙大地的穿山鼠（Sandshrew）对六格外的卡比兽（Snorlax，只会跃起、不会还手），
 * 晴天；脚下的沙让施法者铲到更多沙（沙量与画面更足），落点在卡比兽所在处。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（落点炸开）；落点的地表被烤成沙壳（`changedBlocks` 读到 sandstone）。
 * 灼伤（30% 起）、湿身加成与闷烧都是概率与位置相关的随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("scorchingsands", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.fill([-6, -1, -3], [-2, -1, 3], "minecraft:sand");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sandshrew", level: 40, moves: ["scorchingsands"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("scorchingsands", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        var coat = stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:sandstone"; });
        stage.expect(stage.casts("scorchingsands", caster) > 0, "sandshrew committed scorching sands");
        stage.expect(stage.damageTo(foe) > 0, "the scorching sand burst struck the foe");
        stage.expect(coat.length > 0, "the landing point was baked into a crust of hot sand (leased terrain)");
        stage.note("30% burn and the wet bonus are random; the coat is the baked sand crust (sandstone lease), and the sandy ground under the user widens it",
            { casts: stage.casts("scorchingsands", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
              burned: stage.hadMobEffect(foe, "world_combat:status/burn"), changedBlocks: coat.length, foeAlive: foe.alive() });
        stage.done();
    }, "scorching sands bursts on a foe at range");
});
