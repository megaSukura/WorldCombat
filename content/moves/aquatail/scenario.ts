/**
 * 水流尾 / aquatail —— 可执行设计说明。
 *
 * 一句话：一只大尾精灵对着身前的对手抡出一道向前压的弧形浪，把它拍中、湿身并推开。
 * 必然事实：本招被抡出过、目标受到过伤害、目标身上出现过共享湿身身份 soaked。
 * 拍中几拍、是否浇熄灼伤、被推多远是位置/时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("aquatail", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gyarados", level: 45, moves: ["aquatail"], at: [-1.5, 0, 0] });
    // 皮糙肉厚的陪练，让这一浪拍中后目标还站着，湿身状态能被读到。
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("aquatail", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("aquatail", caster) > 0, "aqua tail was swung");
            stage.expect(stage.damageTo(foe) > 0, "the wave damaged the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the foe carried the shared soaked identity");
            stage.note("浪头按拍推进、越远越淡；被推开的距离取决于体重与是否沉浪，都是位置/取值结果。", {
                casts: stage.casts("aquatail", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                soaked: stage.hadMobEffect(foe, "world_combat:status/soaked"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the wave lands");
});
