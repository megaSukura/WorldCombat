/**
 * 暗黑爆破 / nightdaze 的可执行设计说明。
 *
 * 场面：只会暗黑爆破的索罗亚克（Zoroark）站在两只不会还手、耐打的铁傀儡中间（一左一右），
 *   用来核对这一招是**以自身为心的整圈暗波**、两个方向上的敌人都被罩到。
 * 必然事实：本招被提交过；左右两个敌人都吃到暗波。
 * 笼罩是约 40% 的随机结果、级数与时长随特攻／等级／配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("nightdaze", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zoroark", level: 42, moves: ["nightdaze"], at: [0, 0, 0] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [-3, 0, 0] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("nightdaze", caster) > 0 && stage.damageTo(left) > 0 && stage.damageTo(right) > 0;
    }, function () {
        stage.expect(stage.casts("nightdaze", caster) > 0, "nightdaze was committed");
        stage.expect(stage.damageTo(left) > 0, "the dark wave reached the foe on one side");
        stage.expect(stage.damageTo(right) > 0, "the centred wave also reached the foe on the other side");
        stage.note("shrouded is a roughly 40% base roll (nightdaze.shroudChance); stages, duration, radius, height band and the push follow Sp. Atk/level/body and the eclipse/burst choice. The wave reaches airborne targets too", {
            casts: stage.casts("nightdaze", caster),
            left: Math.round(stage.damageTo(left) * 10) / 10,
            right: Math.round(stage.damageTo(right) * 10) / 10,
            shroudedLeft: stage.hadMobEffect(left, "world_combat:status/shrouded"),
            shroudedRight: stage.hadMobEffect(right, "world_combat:status/shrouded")
        });
        stage.done();
    }, "nightdaze erupts and engulfs both sides within 45 s");
});
