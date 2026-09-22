/**
 * 水流喷射 / aquajet 的可执行设计说明。
 *
 * 一句话：把自己裹进水柱里贴地射出去，撞上谁就把谁浇透、顶开；带着火的目标被这一冲浇熄。
 *
 * 场面：一只只会水流喷射的水系精灵（Squirtle，32 级）面对三格外的僵尸；设为夜晚，僵尸不会被日光灼烧，
 *   所以伤害只可能来自这一冲。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；目标身上出现过共享身份 soaked（命中即浇透）。
 *   起点偏差导致的射空、暴击与具体落点是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("aquajet", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Squirtle", level: 32, moves: ["aquajet"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("aquajet", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/soaked");
    }, function () {
        stage.expect(stage.casts("aquajet", caster) > 0, "aqua jet was committed");
        stage.expect(stage.damageTo(foe) > 0, "the water jet dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the target was soaked");
        stage.note("soaked is the shared wet identity; the dry-land zombie is not immune, so a landed hit always soaks it. Misses come from the zombie stepping out of the line.", {
            casts: stage.casts("aquajet", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "aqua jet soaks the zombie");
});
