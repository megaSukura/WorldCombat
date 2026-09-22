/**
 * 接棒 / batonpass 的可执行设计说明。
 *
 * 场面：只会接棒的飞天螳螂（Scyther，35 级）与只会撞击的卡比兽（Snorlax，40 级）同队站在四格内，
 *   斜前方是一只 50 级、只会跃起的皮卡丘当威胁（双方互相开战，让它盯住施法者，队友盯住它）。
 * 必然事实：本招被提交过（`stage.casts`）；队友接住了棒（共享身份 `world_combat:status/baton_pass`）；
 *   施法者交棒后向背离队友的方向退开（`stage.travelled`）。
 * 棒里实际交出的等级数取决于施法者此刻攒下的能力等级，本场景没有布置等级，写进 note 供读轨迹判断。
 */
Smoke.scenario("batonpass", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 35, moves: ["batonpass"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "snorlax", level: 40, moves: ["tackle"], at: [2, 0, 0] });
    var foe = stage.pokemon({ species: "pikachu", level: 50, moves: ["splash"], at: [7, 0, 3] });
    stage.team("baton", [caster, ally]);
    // 队友与施法者都盯住威胁；威胁盯住施法者，让它成为施法者眼前的对手。
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("batonpass", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/baton_pass");
    }, function () {
        stage.expect(stage.casts("batonpass", caster) > 0, "baton pass was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/baton_pass"), "the ally received the baton (shared identity)");
        stage.expect(stage.travelled(caster) > 0.3, "the user stepped away from the ally");
        stage.note("棒里装的是施法者此刻真实的能力等级；本场景没有先布置等级，所以多半是空棒（交出 0 级）。有等级时队友获得同样等级、施法者对应清空。真正的后备宝可梦替换需要共享的入场／收回入口。", {
            casts: stage.casts("batonpass", caster),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            allyMark: stage.hadMobEffect(ally, "world_combat:status/baton_pass"),
            casterAlive: caster.alive(),
            allyAlive: ally.alive()
        });
        stage.done();
    }, "baton pass hands the baton off and steps away");
});
