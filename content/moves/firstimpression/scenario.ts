/**
 * 迎头一击 / firstimpression 的可执行设计说明。
 *
 * 场面：只会迎头一击的飞天螳螂（30 级、固执）对一只僵尸，夜间（僵尸不会被日光灼烧），两者开战。
 * 必然事实：本招被提交过（它刚出场，满足「还没出过手」）；目标受到过伤害（整段扑砸撞实）。
 * 是否一击致死、是否因僵尸走位而扑空、暴击等是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("firstimpression", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 30, moves: ["firstimpression"], at: [-2, 0, 0], properties: "nature=adamant" });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("firstimpression", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("firstimpression", caster) > 0, "first impression was committed right after entering");
        stage.expect(stage.damageTo(foe) > 0, "the opening lunge dealt damage");
        stage.note("whether the first lunge connected, killed the zombie outright, or whiffed on the zombie's movement is positional and written here for the trace", {
            casts: stage.casts("firstimpression", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "first impression lands on a foe right after entering");
});
