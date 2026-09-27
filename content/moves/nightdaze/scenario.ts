/**
 * 暗黑爆破 / nightdaze 的可执行设计说明。
 *
 * 场面：只会暗黑爆破的索罗亚克（Zoroark）站在两只不会还手、耐打的铁傀儡中间（一左一右），
 *   用来核对这一招是**以自身为心的整圈暗波**、两个方向上的敌人都被罩到。
 *   北侧（+z）竖一道宽墙，墙后另放一只铁傀儡：它与中心之间始终隔着实墙，用来核对暗波被墙截住。
 * 必然事实：本招被提交过；左右两个敌人都吃到暗波；墙后目标一滴不吃。
 * 笼罩是约 40% 的随机结果、级数与时长随特攻／等级／配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("nightdaze", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    // 北墙：z=1 一整排（y 0..3），只挡住 +z 方向，不影响左右两侧的通视；墙后铁傀儡留在 z=3.5，碰撞箱不与墙格重叠。
    stage.fill([-3, 0, 1], [3, 3, 1], "minecraft:stone");
    var caster = stage.pokemon({ species: "zoroark", level: 42, moves: ["nightdaze"], at: [0, 0, 0] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [-3, 0, 0] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var walled = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 3.5] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.hostile(caster, walled);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.command("execute as @e[distance=..15] run attribute @s minecraft:generic.max_health base set 1000");
    stage.command("execute as @e[distance=..15] run data merge entity @s {Health:1000.0f}");
    stage.until(900, function () {
        return stage.casts("nightdaze", caster) > 0 && stage.damageTo(left) > 0 && stage.damageTo(right) > 0 && (stage.hasMobEffect(left, "world_combat:nightdaze_shroud") || stage.hasMobEffect(right, "world_combat:nightdaze_shroud"));
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("nightdaze", caster) > 0, "nightdaze was committed");
            stage.expect(stage.damageTo(left) > 0, "the dark wave reached the foe on one side");
            stage.expect(stage.damageTo(right) > 0, "the centred wave also reached the foe on the other side");
            stage.expect(stage.damageTo(walled) === 0, "the wall blocked the wave from the sealed foe behind it");
            stage.note("shrouded is a roughly 40% base roll (nightdaze.shroudChance); stages, duration, radius, height band, the outward hitDisplace push and the reduction of the accuracy stage follow Sp. Atk/level/body and the eclipse/burst choice. The wave reaches airborne targets too", {
                casts: stage.casts("nightdaze", caster),
                left: Math.round(stage.damageTo(left) * 10) / 10,
                right: Math.round(stage.damageTo(right) * 10) / 10,
                walled: Math.round(stage.damageTo(walled) * 10) / 10,
                shroudedLeft: stage.hadMobEffect(left, "world_combat:status/shrouded"),
                shroudedRight: stage.hadMobEffect(right, "world_combat:status/shrouded")
            });
            const timedTarget = stage.hasMobEffect(left, "world_combat:nightdaze_shroud") ? left : right;
        stage.expect(stage.hasMobEffect(timedTarget, "world_combat:nightdaze_shroud"), "the actual timed carrier is still active");
        stage.expect((stage.stages(timedTarget).accuracy || 0) < 0, "the carrier owns an active ability change");
        stage.setPp(caster, "nightdaze", 0);
        stage.team("timed-b-nightdaze", [caster, timedTarget]);
        stage.boost(timedTarget, { accuracy: 1 });
        stage.command("effect clear " + timedTarget.ref.split("/")[0] + " world_combat:nightdaze_shroud");
        stage.after(5, function () {
            stage.expect(!stage.hasMobEffect(timedTarget, "world_combat:nightdaze_shroud"), "cleansing removes the timed carrier");
            stage.expect((stage.stages(timedTarget).accuracy || 0) === 1, "cleansing restores this move's contribution while preserving a separate +1");
            stage.done();
        });
        });
    }, "nightdaze erupts and engulfs both sides within 45 s");
});
