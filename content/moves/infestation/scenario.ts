/**
 * 死缠烂打的可执行设计说明。
 *
 * 场面：两只都会死缠烂打的精灵（Beedrill 对 Rattata）相隔 6 格开战——双方都受 WorldCombat AI 控制，
 * 因而能检验「缠住之后真的走不开」（AI 导航被共享定身拦下）。
 * 必然事实：本招被提交过；目标身上出现过共享身份 `partiallytrapped`；缠绕期间虫群累计咬掉明显多于初击的伤害；
 * 缠绕期间目标的移动速度被压到 0。
 * 命中、每口啃咬量、持续多久都写进 note 供读轨迹判断。
 */
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
            stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") <= speedAtCling, "rooting held the movement speed down");
            stage.note("swarm matured", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10, health: target.health(), alive: target.alive(),
                movedSinceCling: Math.round((stage.travelled(target) - movedAtCling) * 10) / 10 });
            stage.done();
        }, "swarm gnaws");
    }, "infestation applied");
});
