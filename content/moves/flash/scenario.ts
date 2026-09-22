// 闪光的可执行设计说明：一只高特攻的宝可梦站在两只僵尸中间，只说这一招。
// 必然事实：闪光被放出来过；近处的目标带上共享的「被晃眼」身份；它的攻击属性随之走低。
// 远端只掉一级、命中瞬间的随机结果都不是本场景的必然事实，写进 note 供读轨迹判断。
Smoke.scenario("flash", function (stage) {
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["flash"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var far = stage.mob({ type: "minecraft:zombie", at: [-3, 0, 0] });
    var baseAttack = stage.attribute(near, "minecraft:generic.attack_damage");
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(700, function () {
        return stage.casts("flash", caster) > 0
            && stage.hadMobEffect(near, "world_combat:status/dazzled")
            && stage.attribute(near, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("flash", caster) > 0, "flash was committed");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/dazzled"), "a target carried the shared dazzled identity");
        stage.expect(stage.attribute(near, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the dazzled target's attack fell");
        stage.note("flash is a radial burst gated by line of sight; both zombies carry the effect, and the distance-graded stage applies to the Pokemon accuracy layer only (the effect's attribute penalty is fixed)", {
            casts: stage.casts("flash", caster), baseAttack: baseAttack,
            nearAttack: stage.attribute(near, "minecraft:generic.attack_damage"),
            farAttack: stage.attribute(far, "minecraft:generic.attack_damage"),
            farDazzled: stage.hadMobEffect(far, "world_combat:status/dazzled")
        });
        stage.done();
    }, "flash lands on the targets");
});
