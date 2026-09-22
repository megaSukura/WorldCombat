/**
 * 铁头 / ironhead 的可执行设计说明。
 *
 * 场面：只会铁头的可多拉（Lairon，钢／岩）对一只僵尸，贴身距离、夜间（僵尸不会被日光灼烧），两者开战。
 * 必然事实：本招被提交过；目标受到过伤害（铁砧砸实）。
 * 是否震懵、被掀飞多远、暴击，写进 note 供读轨迹判断（僵尸自己也在走动，位移只作参考）。
 */
Smoke.scenario("ironhead", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Lairon", level: 35, moves: ["ironhead"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("ironhead", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("ironhead", caster) > 0, "ironhead was committed");
        stage.expect(stage.damageTo(foe) > 0, "the iron head slam dealt damage");
        stage.note("the flinch roll, crits and how far the target was hurled are random/positional", {
            casts: stage.casts("ironhead", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "ironhead lands on a foe at close range");
});
