// 泼沙的可执行设计说明：一只地面系宝可梦站在沙地上，对近处两只僵尸只说这一招（也可空踢，见设计说明）。
// 必然事实：泼沙被放出来过；扇面里的目标带上共享的「被糊眼」身份；它的攻击属性随之走低。
// 沙粒颜色取自脚下方块、扇面被地形截断的实际长度、同时糊住几人、命中瞬间的随机结果都不是必然事实，写进 note 供读轨迹判断。
Smoke.scenario("sandattack", function (stage) {
    stage.block([0, -1, 0], "minecraft:sand");
    var caster = stage.pokemon({ species: "Sandshrew", level: 30, moves: ["sandattack"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var side = stage.mob({ type: "minecraft:zombie", at: [2, 0, 1] });
    var baseAttack = stage.attribute(near, "minecraft:generic.attack_damage");
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(700, function () {
        return stage.casts("sandattack", caster) > 0
            && stage.hadMobEffect(near, "world_combat:status/sanded")
            && stage.attribute(near, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("sandattack", caster) > 0, "sand attack was committed");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/sanded"), "a target carried the shared sanded identity");
        stage.expect(stage.attribute(near, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the sanded target's attack fell");
        stage.note("sand attack is a short cone; grit colour comes from the block under the caster (sand here) and the fan can catch several foes", {
            casts: stage.casts("sandattack", caster), baseAttack: baseAttack,
            nearAttack: stage.attribute(near, "minecraft:generic.attack_damage"),
            sideSanded: stage.hadMobEffect(side, "world_combat:status/sanded"),
            changedBlocks: stage.changedBlocks().length
        });
        stage.done();
    }, "sand attack lands in the cone");
});
