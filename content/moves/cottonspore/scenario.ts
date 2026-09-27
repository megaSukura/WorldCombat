// 棉孢子的可执行设计说明：一只只会这招的宝可梦让两只僵尸贴到身边，然后当场炸开棉絮。
// 必然事实：棉孢子被放出来过；至少一个贴身的僵尸带上共享的「被棉絮黏住」身份，移动速度属性随之下降。
// 具体罩住几只取决于引爆瞬间双方站位（野生的施法者被打后会边打边退），写进 note 供读轨迹判断。
Smoke.scenario("cottonspore", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "oddish", level: 35, moves: ["cottonspore"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [1.4, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [0, 0, 1.4] });
    var baseA = stage.attribute(foeA, "minecraft:generic.movement_speed");
    var baseB = stage.attribute(foeB, "minecraft:generic.movement_speed");
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.noai(foeA, foeB);
    stage.until(800, function () {
        return stage.casts("cottonspore") > 0
            && (stage.hadMobEffect(foeA, "world_combat:status/cottoned")
                || stage.hadMobEffect(foeB, "world_combat:status/cottoned"))
            && (stage.attribute(foeA, "minecraft:generic.movement_speed") < baseA - 0.001
                || stage.attribute(foeB, "minecraft:generic.movement_speed") < baseB - 0.001);
    }, function () {
        stage.expect(stage.casts("cottonspore") > 0, "cotton spore was committed");
        stage.expect(stage.hadMobEffect(foeA, "world_combat:status/cottoned")
            || stage.hadMobEffect(foeB, "world_combat:status/cottoned"), "at least one nearby target was cottoned");
        stage.expect(stage.attribute(foeA, "minecraft:generic.movement_speed") < baseA - 0.001
            || stage.attribute(foeB, "minecraft:generic.movement_speed") < baseB - 0.001, "a cottoned target's speed fell");
        stage.note("cotton spore caught the zombies standing inside the spore radius at detonation; how many depends on where each stood", {
            casts: stage.casts("cottonspore"),
            cottonedA: stage.hadMobEffect(foeA, "world_combat:status/cottoned"),
            cottonedB: stage.hadMobEffect(foeB, "world_combat:status/cottoned"),
            speedA: [baseA, stage.attribute(foeA, "minecraft:generic.movement_speed")],
            speedB: [baseB, stage.attribute(foeB, "minecraft:generic.movement_speed")],
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.setPp(caster, "cottonspore", 0);
        stage.noai(foeA, foeB);
        const affected = stage.hasMobEffect(foeA, "world_combat:status/cottoned") ? foeA : foeB;
        stage.boost(affected, { spe: 1 });
        stage.until(600, function () { return !stage.hasMobEffect(affected, "world_combat:status/cottoned"); }, function () {
            stage.after(3, function () {
                stage.expect((stage.stages(affected).spe || 0) === 1, "cotton expires and restores its Speed loss without removing another gain");
                stage.done();
            });
        }, "cotton naturally falls away");
    }, "cotton spore catches a nearby zombie");
});
