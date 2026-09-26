// 烟幕的可执行设计说明：一只宝可梦对挤在一起的两只僵尸只说这一招，先吐出一团会前进的烟，烟飞到落点才绽成云。
// 必然事实：烟幕被放出来过；云里的目标带上共享的「被烟呛」身份；它的攻击属性随之走低。
// 烟要飞几刻、云同时罩住几人、套多久、命中瞬间的随机结果都不是必然事实，写进 note 供读轨迹判断。
Smoke.scenario("smokescreen", function (stage) {
    var caster = stage.pokemon({ species: "koffing", level: 35, moves: ["smokescreen"], at: [-4, 0, 0] });
    var first = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var second = stage.mob({ type: "minecraft:zombie", at: [2, 0, 1] });
    var baseAttack = stage.attribute(first, "minecraft:generic.attack_damage");
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(800, function () {
        return stage.casts("smokescreen", caster) > 0
            && stage.hadMobEffect(first, "world_combat:status/smoked")
            && stage.attribute(first, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("smokescreen", caster) > 0, "smokescreen was committed");
        stage.expect(stage.hadMobEffect(first, "world_combat:status/smoked"), "a target carried the shared smoked identity");
        stage.expect(stage.attribute(first, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the choked target's attack fell");
        stage.note("smokescreen puffs a flying wisp that blooms into a lingering field at the spot; the cloud keeps impairing whoever stays inside and lingers after leaving", {
            casts: stage.casts("smokescreen", caster), baseAttack: baseAttack,
            attack: stage.attribute(first, "minecraft:generic.attack_damage"),
            secondSmoked: stage.hadMobEffect(second, "world_combat:status/smoked")
        });
        stage.done();
    }, "smokescreen lands on the target");
});
