/**
 * 浊流 / muddywater 的可执行设计说明。
 *
 * 场面：一只只会浊流的沼跃鱼（Mudkip）站在石地面上，面前一条线上立着两只不会还手、耐打的铁傀儡。
 * 必然事实：本招被提交过；前方两个敌人都吃到泥浪；扫过的地面没有被替换成泥（新的设计只留短泥膜粒子）。
 * 糊眼是 30% 起的随机结果、级数与时长随特攻／等级／配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("muddywater", function (stage) {
    stage.fill([-9, -1, -6], [9, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mudkip", level: 36, moves: ["muddywater"], at: [-5, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.watch([-8, -1, -5], [8, 1, 5]);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("muddywater", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(far) > 0;
    }, function () {
        stage.expect(stage.casts("muddywater", caster) > 0, "muddywater was committed");
        stage.expect(stage.damageTo(near) > 0, "the muddy wave reached the first foe on the line");
        stage.expect(stage.damageTo(far) > 0, "the wave kept spreading and reached the foe behind it");
        stage.expect(!stage.changedBlocks().some(function (entry) { return entry.after === "minecraft:mud"; }),
            "the sweep leaves a short mud film, not a replaced ground");
        stage.note("murky is a roughly 30% base roll (muddywater.murkChance); stages and duration follow Sp. Atk/level/body and the silting choice. The wave clips at obstacles per segment via world.clear, and its ground mark is now only short-lived particles", {
            casts: stage.casts("muddywater", caster),
            near: Math.round(stage.damageTo(near) * 10) / 10,
            far: Math.round(stage.damageTo(far) * 10) / 10,
            murkyNear: stage.hadMobEffect(near, "world_combat:status/murky"),
            murkyFar: stage.hadMobEffect(far, "world_combat:status/murky"),
            changedGround: stage.changedBlocks().length
        });
        stage.done();
    }, "muddywater washes over two foes within 45 s");
});
