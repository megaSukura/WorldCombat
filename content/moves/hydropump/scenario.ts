/**
 * 水炮 / hydropump 的可执行设计说明。
 *
 * 场面：只会水炮的水箭龟（45 级）对两只挨得近、不会还手的铁傀儡（耐打又不会跑掉的靶子）；
 *   开打前把配置切到漫灌式，让水柱撞停后的一圈回溅有可断言的对象。
 * 必然事实：本招被提交过、两只各受过伤害、两只都带上湿透身份。
 * 水柱只持续 6 刻且首个敌人只吃一次主伤；配置在敌意建立前写入，保证第一发就是漫灌式。
 * 散射角、流速、回溅范围、湿身时长与推距都随精灵数据变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("hydropump", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "blastoise", level: 45, moves: ["hydropump"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    var beside = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..9] {NoAI:1b}");
    stage.after(1, function () {
        stage.prefer(caster, "hydropump", { deluge: true });
        stage.hostile(caster, near);
        stage.hostile(caster, beside);
    });
    stage.until(1200, function () {
        return stage.casts("hydropump", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(beside) > 0
            && stage.hadMobEffect(near, "world_combat:status/soaked")
            && stage.hadMobEffect(beside, "world_combat:status/soaked");
    }, function () {
        stage.expect(stage.casts("hydropump", caster) > 0, "hydropump was committed");
        stage.expect(stage.damageTo(near) > 0, "the column struck one of the two foes");
        stage.expect(stage.damageTo(beside) > 0, "the deluge backwash doused the other foe at the stopping point");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/soaked"), "one foe carried the shared soaked identity");
        stage.expect(stage.hadMobEffect(beside, "world_combat:status/soaked"), "the other foe carried the shared soaked identity");
        stage.note("the column holds for 6 ticks and the first foe takes the torrent once; spread, flow, backwash radius, soak duration and push distance follow Sp. Atk/Speed/weight/level (design facts verified in the full assembly)", {
            casts: stage.casts("hydropump", caster),
            near: Math.round(stage.damageTo(near) * 10) / 10,
            beside: Math.round(stage.damageTo(beside) * 10) / 10,
            events: stage.damageEvents().length
        });
        stage.done();
    }, "hydropump lands its column and the deluge backwash reaches the second foe");
});
