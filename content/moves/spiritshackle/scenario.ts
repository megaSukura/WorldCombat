/**
 * 缝影 / spiritshackle —— 可执行设计说明。
 *
 * 一句话：射一支暗影箭，命中目标即造成穿影伤害，并把它的影子钉在地上、挂上共享身份「trapped」。
 *
 * 场面：一只只会缝影的狙射树枭（50 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害、目标身上出现过 world_combat:status/trapped。
 * 影子缝线绷断的时机（被外力带离锚点）写进 note。
 */
Smoke.scenario("spiritshackle", function (stage) {
    stage.fill([-8, -1, -10], [8, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "decidueye", level: 50, moves: ["spiritshackle"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("spiritshackle", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/trapped");
    }, function () {
        stage.expect(stage.casts("spiritshackle", caster) >= 1, "caster committed spiritshackle");
        stage.expect(stage.damageTo(foe) > 0, "spiritshackle dealt damage to the foe");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target's shadow was stitched (trapped)");
        stage.note("trapped is the shared identity; the pin ends when the target is dragged past escape or the duration runs out", {
            casts: stage.casts("spiritshackle", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "spiritshackle lands within 30 s");
});
