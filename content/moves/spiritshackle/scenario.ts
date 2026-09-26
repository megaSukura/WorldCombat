/**
 * 缝影 / spiritshackle —— 可执行设计说明。
 *
 * 一句话：射一支暗影箭，命中目标即造成穿影伤害，并把它的影子钉在它脚下的实际地面、挂上共享身份「trapped」。
 *
 * 场面一（地面钉影）：一只只会缝影的狙射树枭（50 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 *   必然事实：这招被提交过、目标受过伤害、目标身上出现过 world_combat:status/trapped；驱散钉住载体后身份消失。
 * 场面二（飞空无地表）：同样的施法者对一只悬空、脚下 7 格内无实心方块的铁傀儡。
 *   必然事实：箭仍造成伤害，但脚下没有可缝的地表，不挂 trapped。
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
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target's shadow was stitched (trapped) on real ground");
        stage.command("effect clear " + foe.ref.split("/")[0] + " world_combat:spiritshackle_pinned");
        stage.after(5, function () {
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/trapped"), "clearing the pinned carrier removes the trapped identity");
            stage.note("trapped is the shared identity; the seam ends when the target is dragged past escape, the anchor block is gone, the carrier is removed, or the duration runs out", {
                casts: stage.casts("spiritshackle", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "spiritshackle lands within 30 s");
});

Smoke.scenario("spiritshackle-airborne", function (stage) {
    stage.fill([-8, -1, -10], [8, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "decidueye", level: 50, moves: ["spiritshackle"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 8, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..20,limit=1] {NoAI:1b,NoGravity:1b}");
    stage.until(600, function () {
        return stage.casts("spiritshackle", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("spiritshackle", caster) >= 1, "caster committed spiritshackle");
        stage.expect(stage.damageTo(foe) > 0, "the arrow still damaged the airborne foe");
        stage.expect(!stage.hadMobEffect(foe, "world_combat:status/trapped"), "no ground underfoot leaves no shadow to stitch");
        stage.note("an airborne target has no real ground shadow, so only the arrow damage lands; the AI values it as arrow damage only", {
            casts: stage.casts("spiritshackle", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10
        });
        stage.done();
    }, "spiritshackle fires at the airborne foe within 30 s");
});
