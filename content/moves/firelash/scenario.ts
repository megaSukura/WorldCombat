/**
 * 火焰鞭 / firelash 的可执行设计说明。
 *
 * 场面：只会火焰鞭的精灵（Salazzle 36 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   相隔 3 格。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害。鞭长、威力、命中后目标防御下降的级数（原生必然 −1）、
 *   缠卷式是否把目标拖近，都写进 note 供读轨迹判断。
 */
Smoke.scenario("firelash", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "salazzle", level: 36, moves: ["firelash"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("firelash", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("firelash", caster) > 0, "firelash was committed");
            stage.expect(stage.damageTo(foe) > 0, "the burning lash dealt damage to the foe");
            stage.note("every landed lash lowers the target's Defense by melt (native 1, entangle form 2); lash power/reach follow Attack/Speed/height/level and the entangle/lash choice (design facts verified in the full assembly)", {
                casts: stage.casts("firelash", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "firelash commits and its lash lands within 45 s");
});
