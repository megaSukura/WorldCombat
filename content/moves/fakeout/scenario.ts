/**
 * 击掌奇袭 / fakeout 的可执行设计说明。
 *
 * 场面：只会击掌奇袭的喵喵（30 级、开朗）对一只僵尸，夜间（僵尸不会被日光灼烧），两者开战。
 * 必然事实：本招被提交过（它刚出场，满足「还没出过手」）；目标受到过伤害（掌掴打实）。
 * 是否拍懵、是否因僵尸走位而挥空、暴击等是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("fakeout", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowth", level: 30, moves: ["fakeout"], at: [-2, 0, 0], properties: "nature=jolly" });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("fakeout", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/flinch");
    }, function () {
        stage.expect(stage.casts("fakeout", caster) > 0, "fake out was committed right after entering");
        stage.expect(stage.damageTo(foe) > 0, "the opening slap dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/flinch"), "the solid hit left the target flinched (native 100% daze)");
        stage.note("the daze is guaranteed on a solid hit; the trace shows whether the blink connected and how the flinch landed", {
            casts: stage.casts("fakeout", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            dazed: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "fake out lands on a foe right after entering");
});
