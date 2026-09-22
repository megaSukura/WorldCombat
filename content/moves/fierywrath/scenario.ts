/**
 * 怒火中烧 / fierywrath —— 可执行设计说明。
 *
 * 一句话：把愤怒从身体里炸开成一道以自身为中心的环状气场，圈内敌人近重远轻地吃伤并可能被震懵。
 *
 * 场面：会怒火中烧的黑鲁加带这一招，站在两只挤在一起的小敌前；它必须先走进气场半径里再炸开。
 *
 * 断言只取必然事实：这招被放过、至少有一只小敌挨到伤害。畏缩是否触发（约 20% 的随机掷）、
 * 两只敌人在圈内的距离衰减各是多少，都写进 note 供读轨迹判断。
 */
Smoke.scenario("fierywrath", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "houndoom", level: 40, moves: ["fierywrath"], at: [-3, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1000, function () {
        return stage.casts("fierywrath", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("fierywrath", caster) >= 1, "houndoom committed fierywrath");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the aura dealt damage");
        stage.note("crit, the flinch roll and the distance falloff for each foe are random/positional", {
            casts: stage.casts("fierywrath", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            anyFlinched: stage.hadMobEffect(first, "world_combat:status/flinch") || stage.hadMobEffect(second, "world_combat:status/flinch"),
            firstAlive: first.alive()
        });
        stage.done();
    }, "fierywrath lands on a foe within 50 s");
});
