/**
 * 岩崩 / rockslide —— 可执行设计说明。
 *
 * 一句话：把身前地面上的岩石一块块沿弧线甩向选定的一片地，落点周围的敌人挨砸，被砸实的可能畏缩。
 *
 * 场面：会岩崩的隆隆石带这一招，站在两只挤在一起的小敌前；小敌用撞击还手，逼出成片撒石的场面。
 *
 * 断言只取必然事实：这招被放过、至少有一只小敌挨到伤害（落点会散开，所以不假设两只都中）。
 * 暴击、畏缩是否触发（约 24% 的随机掷）、每只具体挨了几记都写进 note 供读轨迹判断。
 */
Smoke.scenario("rockslide", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["rockslide"], at: [-4, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    var castTick = 0;
    stage.until(1000, function () {
        if (castTick === 0 && stage.casts("rockslide", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 70 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("rockslide", caster) >= 1, "golem committed rockslide");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the rock rain dealt damage");
        stage.expect(stage.changedBlocks().length === 0, "rockslide leaves the ground unchanged");
        stage.note("crit, the flinch roll and how many rocks landed on each foe are random and positional", {
            casts: stage.casts("rockslide", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            anyFlinched: stage.hadMobEffect(first, "world_combat:status/flinch") || stage.hadMobEffect(second, "world_combat:status/flinch"),
            changed: stage.changedBlocks().length,
            firstAlive: first.alive()
        });
        stage.done();
    }, "rockslide lands on a foe within 50 s");
});
