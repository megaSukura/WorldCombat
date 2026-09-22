/**
 * 乱击 / furyattack —— 可执行设计说明。
 *
 * 一句话：一只只会乱击的烈雀站定，用喙朝身前贴着石墙的僵尸一刺接一刺地戳，至少有一刺落在它身上。
 *
 * 场面：只会乱击的烈雀（spearow，L30，原生 11 级学习）站在僵尸左侧 2 格；僵尸背后紧贴一堵石墙，把它顶住，
 *   好让「顶退」不把它推出射程（这正是这招被角落放大的读法）。夜间，僵尸不会被日光灼烧。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一刺的伤害（`stage.damageTo`）。
 *   刺数（2～5）、每刺命中率 85、是否在某一刺擦空或把目标顶出射程而提前收场、顶退距离与暴击，都是随机或位置结果，
 *   写进 note 供读轨迹判断。
 */
Smoke.scenario("furyattack", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([2, 0, -1], [2, 2, 1], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "spearow", level: 30, moves: ["furyattack"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("furyattack", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("furyattack", caster) >= 1, "the caster committed furyattack");
            stage.expect(stage.damageTo(foe) > 0, "the jabs dealt damage to the foe");
            stage.note("jabs (2-5) follow attack/level; each jab rolls 85% and shoves the target with Attack/weight; the stone wall behind the foe is what keeps it in reach so more of the string lands", {
                casts: stage.casts("furyattack", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "furyattack jabs a walled-in foe within 60 s");
});
