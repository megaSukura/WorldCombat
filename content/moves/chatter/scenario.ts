/**
 * 喋喋不休 / chatter —— 可执行设计说明。
 *
 * 一句话：一只聒噪的鸟凑到僵尸身边，对着它连叫一串尖叫，把它叫懵。
 * 必然事实：本招被叫出过、目标受到过伤害、目标身上出现过共享混乱身份。
 * 连叫几声、每声是否暴击、混乱后续是否真的打散出手都是随机/时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("chatter", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "chatot", level: 40, moves: ["chatter"], at: [-2.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("chatter", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("chatter", caster) > 0, "chatter was cried");
            stage.expect(stage.damageTo(foe) > 0, "the bursts damaged the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the foe carried the shared confusion identity");
            stage.note("多段与混乱都是本招设计的一部分：混乱必然挂上，之后出手作废与反噬是随机结果。", {
                casts: stage.casts("chatter", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                confused: stage.hadMobEffect(foe, "world_combat:status/confusion"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "chatter lands");
});
