/**
 * 清除之烟 / clearsmog —— 可执行设计说明。
 *
 * 一句话：掷出一团浊泥砸中目标，炸开一片清浊之烟，把目标的能力等级冲回原点、还短暂压住不让它再攒。
 *
 * 场面：一只只会清除之烟的气球（Koffing，真实学习者）正对一只被点住、不会还手的铁傀儡（5 格外）。
 *   必然事实：本招被提交过、目标受过伤害、目标身上出现过共享身份 `world_combat:status/smogged`。
 *   被冲掉的等级数、烟团罩住几个目标、黏烟期间是否反复冲散都写进 note（靶子身上原本没有等级可冲）。
 */
Smoke.scenario("clearsmog", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "koffing", level: 30, moves: ["clearsmog"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("clearsmog", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/smogged");
    }, function () {
        stage.expect(stage.casts("clearsmog", caster) > 0, "koffing committed clear smog");
        stage.expect(stage.damageTo(foe) > 0, "the mud clump dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/smogged"), "the smog cloud marked the target with the shared identity");
        stage.note("the bag starts with no stat changes, so how many stages were wiped and the repeated scour are read from the trace; the mark and the veil still land", {
            casts: stage.casts("clearsmog", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            smogged: stage.hadMobEffect(foe, "world_combat:status/smogged"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "clear smog lands and marks the foe within 35 s");
});
