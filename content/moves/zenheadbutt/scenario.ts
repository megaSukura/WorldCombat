/**
 * 意念头锤 / zenheadbutt 的可执行设计说明。
 *
 * 场面：只会意念头锤的玛沙那（Meditite）对一只僵尸，中距离、夜间（僵尸不会被日光灼烧），两者开战。
 * 靶子会朝施法者直走，念力制导正好咬得住这条直线，所以命中是这一招的正常结果。
 * 必然事实：本招被提交过；目标受到过伤害（制导冲刺撞实）。
 * 畏缩是否掷出、暴击、制导在目标急折时是否被甩开，写进 note 供读轨迹判断。
 */
Smoke.scenario("zenheadbutt", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Meditite", level: 35, moves: ["zenheadbutt"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("zenheadbutt", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("zenheadbutt", caster) > 0, "zenheadbutt was committed");
        stage.expect(stage.damageTo(foe) > 0, "the guided dash dealt damage");
        stage.note("the flinch roll, crits and whether the guidance tracked the walking target are random/positional", {
            casts: stage.casts("zenheadbutt", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "zenheadbutt lands on a foe within reach");
});
