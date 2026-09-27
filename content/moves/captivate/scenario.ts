// 诱惑的可执行设计说明：一只只会诱惑的宝可梦看住一只不会动、不会还手的僵尸。
// 必然事实：诱惑被放出来过；目标带上共享的「被诱惑」身份；注视期间目标共享阶梯里的特攻被压低至少两级；
// 本招不造成伤害；把目标移出射程后断线，降级精确复原。
// 专注注视档、同性宝可梦与掩体遮断不是本场景的必然事实，写进 note。
Smoke.scenario("captivate", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["captivate"], at: [-1, 0, 0], properties: "gender=male" });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..12,limit=1] {NoAI:1b}");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("captivate") > 0
            && stage.hasMobEffect(target, "world_combat:status/captivated")
            && (stage.stages(target).spa || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("captivate") > 0, "captivate was committed");
        stage.expect(stage.hasMobEffect(target, "world_combat:status/captivated"), "the gazed target currently carries the shared captivated identity");
        stage.expect((stage.stages(target).spa || 0) <= -2, "the target's shared Sp. Atk was held down while the gaze lasted");
        stage.expect(stage.damageTo(target) <= 0.001, "captivate itself dealt no damage");
        stage.note("the drop exists only while the line is held; the next step breaks the line to check the release", {
            casts: stage.casts("captivate"), stages: stage.stages(target), targetHp: target.health()
        });
        // 把目标移出凝视距离：断线 → 锁结束 → 窗口关闭 → 等级复原。
        stage.command("tp @e[type=minecraft:zombie,distance=..12,limit=1] ~40 ~ ~");
        stage.after(60, function () {
            stage.expect(!stage.hasMobEffect(target, "world_combat:status/captivated"), "breaking the line removed the shared identity");
            stage.expect((stage.stages(target).spa || 0) === 0, "the Sp. Atk drop was fully restored once the gaze broke");
            stage.note("breaking the line by leaving range closed the window and restored the exact level; the focused gaze and same-gender cases are separate", {
                stages: stage.stages(target), targetHp: target.health()
            });
            stage.done();
        });
    }, "captivate holds the target, then releases when the line breaks");
});

// 同性宝可梦：异性只是风味文字，功能不再按性别硬拒，同性目标同样被看住、原生特攻阶梯下降，且不造成伤害。
Smoke.scenario("captivate-same-gender", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["captivate"], at: [-1, 0, 0], properties: "gender=male" });
    var target = stage.pokemon({ species: "abra", level: 40, moves: [], at: [3, 0, 0], properties: "gender=male" });
    stage.noai(target);
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("captivate", caster) > 0
            && stage.hasMobEffect(target, "world_combat:status/captivated")
            && (stage.stages(target).spa || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("captivate", caster) > 0, "captivate was committed");
        stage.expect(stage.hasMobEffect(target, "world_combat:status/captivated"), "same-gender Pokemon are no longer hard-immune");
        stage.expect((stage.stages(target).spa || 0) <= -2, "the same-gender target's native Sp. Atk fell");
        stage.expect(stage.damageTo(target) <= 0.001, "captivate itself dealt no damage");
        stage.note("opposite gender is flavour only now; this run asserts a same-gender Pokemon is affected", {
            casts: stage.casts("captivate", caster), stages: stage.stages(target), damageTo: stage.damageTo(target)
        });
        stage.done();
    }, "captivate ignores gender");
});
