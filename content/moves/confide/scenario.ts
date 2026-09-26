// 密语的可执行设计说明：一只高特攻的宝可梦对一只没有特攻概念的原版生物说一句秘密，只说这一招。
// 必然事实：密语被放出来过；目标带上共享的「失神」身份；目标共享阶梯里的特攻被说低至少一级；
// 密语本身不造成任何伤害。
// 原版生物没有特攻属性，特攻落在世界共享的 spa 阶梯上；命中瞬间目标在不在出手、传谣扩散到几个人写进 note。
Smoke.scenario("confide", function (stage) {
    // 正午的太阳会把僵尸点燃；调成午夜，让「没有伤害」这条断言只反映本招。
    stage.time("midnight");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["confide"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("confide") > 0
            && stage.hadMobEffect(target, "world_combat:status/confided")
            && (stage.stages(target).spa || 0) <= -1;
    }, function () {
        stage.expect(stage.casts("confide") > 0, "confide was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confided"), "the target carried the shared confided identity");
        stage.expect((stage.stages(target).spa || 0) <= -1, "the staged whisper dropped the shared Sp. Atk at least one step");
        stage.expect(stage.damageTo(target) <= 0.001, "confide itself dealt no damage");
        stage.note("confide landed; whether cover was involved and the rumor spread are not part of this run", {
            casts: stage.casts("confide"), stages: stage.stages(target), damageTo: stage.damageTo(target),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "confide lands on the target");
});
