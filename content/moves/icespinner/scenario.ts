/**
 * 冰旋 / icespinner —— 可执行设计说明。
 *
 * 一句话：脚上结冰、朝瞄准方向旋转冲出，沿途刮掉场地并在冲过的地面留下冰面。
 *
 * 场面：一只只带「冰旋」的冰系物攻手，对一只会自己贴上来的僵尸（夜里的近身靶）。
 * 必然事实：冰旋被提交过、施法者打出过伤害、地面出现过冰面租借（changedBlocks 变化）。
 * 场地刮除需要场上有真实场地；本单元不含场地来源，因此这一批只跑本单元时不存在可刮的场地，
 *   「刮掉了几片」与「场地身份出现过」写进 note；与任一带场地的单元同批装配时会一并触发。
 * 具体刮掉几片、冰面铺几格属世界写入结果，写进 note。
 */
Smoke.scenario("icespinner", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mamoswine", level: 48, moves: ["icespinner"], at: [-4, 0, 0], properties: "nature=adamant" });
    // 僵尸会自己贴上来，是冰旋这种短距接触招的合适靶子；夜里不会自燃。
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1800, function () {
        return stage.casts("icespinner", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("icespinner", caster) >= 1, "mamoswine committed ice spinner");
            stage.expect(stage.damageTo(foe) > 0, "the spinning slam dealt damage");
            stage.expect(changed.length > 0, "the spin left ice on the ground");
            stage.note("the spin sweeps any real terrain out of its path and leases a short-lived ice trail on the ground. With no terrain-source unit in this batch there were no fields to dispel, so which fields would be removed is not exercised here; the sweep runs the same code path with an empty result.", {
                casts: stage.casts("icespinner", caster),
                dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                changedBlocks: changed.length,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "ice spinner lands on the target within 90 s");
});
