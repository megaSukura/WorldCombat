/**
 * 水枪 / watergun 的可执行设计说明。
 *
 * 场面：只会水枪的杰尼龟（30 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 必然事实：本招被提交过（`stage.casts`）、目标受过伤害（`stage.damageTo`）——其余只写进 note。
 * 水花量与喷射速度、射程随特攻／速度／等级变化，属于设计事实，由完整装配的人工试玩核对。
 */
Smoke.scenario("watergun", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 30, moves: ["watergun"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("watergun", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("watergun", caster) > 0, "watergun was committed");
        stage.expect(stage.damageTo(foe) > 0, "the water line dealt damage to the foe");
        stage.note("a single-target line; damage per shot, jet speed and range follow Sp. Atk/Speed/level (design facts verified in the full assembly)", {
            casts: stage.casts("watergun", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "watergun commits and hits within 30 s");
});
