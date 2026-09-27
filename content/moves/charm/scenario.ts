// 撒娇的可执行设计说明：一只近身的宝可梦对身前两个站定的原版生物一起撒娇，只说这一招。
// 必然事实：撒娇被放出来过；至少一个被接纳入扇面的目标带上共享的「被撒娇」身份；它的攻击随下降的攻击走低。
// 扇面的实际张角/半径、谁真正落在正面、谁被墙挡住、以及贴近／飞吻的取舍都不是本场景的必然事实，写进 note。
// 夜间并冻结目标，避免日照灼烧与追击把目标推近或推散，让「正面扇面一次软到多人」这件事成为必然。
Smoke.scenario("charm", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "skitty", level: 30, moves: ["charm"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:zombie", at: [1.5, 0, -0.5] });
    var side = stage.mob({ type: "minecraft:zombie", at: [1.5, 0, 0.5] });
    stage.noai(near, side);
    var baseNear = stage.attribute(near, "minecraft:generic.attack_damage");
    var baseSide = stage.attribute(side, "minecraft:generic.attack_damage");
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(600, function () {
        return stage.casts("charm") > 0
            && stage.hadMobEffect(near, "world_combat:status/charmed")
            && stage.attribute(near, "minecraft:generic.attack_damage") < baseNear - 0.001;
    }, function () {
        stage.expect(stage.casts("charm") > 0, "charm was committed");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/charmed"), "the near target carried the shared charmed identity");
        stage.expect(stage.attribute(near, "minecraft:generic.attack_damage") < baseNear - 0.001, "the near target's attack fell with the Attack drop");
        stage.note("charm landed as a front fan; how many of the two targets were inside the real 90° fan and whether the second was also charmed are not part of this run", {
            casts: stage.casts("charm"), baseNear: baseNear,
            nearAttack: stage.attribute(near, "minecraft:generic.attack_damage"),
            nearCharmed: stage.hadMobEffect(near, "world_combat:status/charmed"),
            baseSide: baseSide, sideAttack: stage.attribute(side, "minecraft:generic.attack_damage"),
            sideCharmed: stage.hadMobEffect(side, "world_combat:status/charmed"),
            casterHp: caster.health(), nearHp: near.health(), sideHp: side.health()
        });
        stage.done();
    }, "charm lands on the front target");
});
