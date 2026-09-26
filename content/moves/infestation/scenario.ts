// 检查真实附着、持续伤害与仍可移动；甩落数量和行进轨迹写入 note。
Smoke.scenario("infestation", function (stage) {
    var caster = stage.pokemon({ species: "Beedrill", level: 40, moves: ["infestation"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "Rattata", level: 25, moves: ["infestation"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("infestation") > 0 && stage.hadMobEffect(target, "world_combat:status/partiallytrapped");
    }, function () {
        stage.expect(stage.casts("infestation") > 0, "infestation was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
        var afterBite = stage.damageTo(target);
        var movedAtCling = stage.travelled(target);
        var speedAtCling = stage.attribute(target, "minecraft:generic.movement_speed");
        stage.note("swarm clung", { casts: stage.casts("infestation"), damage: afterBite,
            moved: Math.round(movedAtCling * 10) / 10, speed: Math.round(speedAtCling * 1000) / 1000 });
        stage.until(900, function () { return stage.damageTo(target) >= afterBite + 3 || !target.alive(); }, function () {
            stage.expect(stage.damageTo(target) >= afterBite + 3, "the swarm gnawed well beyond the initial bite");
            stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") > 0, "the infested target retains movement speed");
            stage.note("swarm matured", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10, health: target.health(), alive: target.alive(),
                movedSinceCling: Math.round((stage.travelled(target) - movedAtCling) * 10) / 10 });
            stage.done();
        }, "swarm gnaws");
    }, "infestation applied");
});
