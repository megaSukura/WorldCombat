// 密语的可执行设计说明：一只高特攻的宝可梦对一只没有特攻概念的原版生物说一句秘密，只说这一招。
// 必然事实：密语被放出来过；目标带上共享的「失神」身份；目标共享阶梯里的特攻被说低至少一级；
// 密语本身不造成任何伤害；把失神标记驱散后，特攻降级精确复原（下降只随窗口存在）。
// 原版生物没有特攻属性，特攻落在世界共享的 spa 阶梯上；隔掩体的听距写进 note。
Smoke.scenario("confide", function (stage) {
    // 正午的太阳会把僵尸点燃；调成午夜，让「没有伤害」这条断言只反映本招。
    stage.time("midnight");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["confide"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.noai(target);
    stage.setPp(caster, "confide", 0);
    stage.hostile(caster, target);
    stage.after(20, function () {
        stage.fill([1, 0, -4], [1, 4, 4], "minecraft:stone");
        stage.setPp(caster, "confide", 20);
        stage.note("The foe was actually visible, then a wall hid its stationary body. The next whisper must use the last-seen world point.");
    });
    stage.until(700, function () {
        return stage.casts("confide") > 0
            && stage.hasMobEffect(target, "world_combat:status/confided")
            && (stage.stages(target).spa || 0) <= -1;
    }, function () {
        stage.expect(stage.casts("confide") > 0, "confide was committed");
        stage.expect(stage.hasMobEffect(target, "world_combat:status/confided"), "the target currently carries the shared confided identity");
        stage.expect((stage.stages(target).spa || 0) <= -1, "the staged whisper dropped the shared Sp. Atk at least one step");
        stage.expect(stage.damageTo(target) <= 0.001, "confide itself dealt no damage");
        stage.note("the drop is temporary and rides the distraction window; clearing that mark next checks the restore", {
            casts: stage.casts("confide"), stages: stage.stages(target), damageTo: stage.damageTo(target),
            casterHp: caster.health(), targetHp: target.health()
        });
        // 驱散失神标记：窗口结束 → 特攻精确复原。
        stage.command("effect clear @e[type=minecraft:zombie,distance=..12,limit=1] world_combat:confided_whisper");
        stage.after(20, function () {
            stage.expect(!stage.hasMobEffect(target, "world_combat:status/confided"), "curing the mark removed the shared identity");
            stage.expect((stage.stages(target).spa || 0) === 0, "the Sp. Atk drop was fully restored once the window ended");
            stage.note("A fixed last-seen point through cover was heard; curing the distraction mark closed the window and restored the exact level", {
                stages: stage.stages(target)
            });
            stage.done();
        });
    }, "confide lands and releases with the distraction window");
});
