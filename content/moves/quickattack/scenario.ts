/**
 * 电光一闪 / quickattack 的可执行设计说明。
 *
 * 一句话：贴地冲出一小段，在对手出手前先撞上一点，撞上就停。
 *
 * 场面：一只只会电光一闪的小型精灵（Rattata，32 级、爽朗）面对三格外的僵尸；设为夜晚，僵尸不会被日光灼烧，
 *   所以伤害只可能来自这一撞。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（冲刺撞实）。
 *   起点偏差导致的冲空、暴击与具体落点是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("quickattack", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Rattata", level: 32, moves: ["quickattack"], at: [-2, 0, 0], properties: "nature=jolly" });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("quickattack", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("quickattack", caster) > 0, "quick attack was committed");
        stage.expect(stage.damageTo(foe) > 0, "the lunge dealt damage");
        stage.note("a short dash that stops on the first body; misses come from the zombie stepping out of the line. The reaction window is the short preparation.", {
            casts: stage.casts("quickattack", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "quick attack lands on the zombie");
});
