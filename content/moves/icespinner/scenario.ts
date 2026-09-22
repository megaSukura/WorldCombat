/**
 * 冰旋 / icespinner —— 可执行设计说明。
 *
 * 一句话：脚上结冰、旋转冲进目标，沿途刮掉场地并在冲过的地面留下冰面。
 *
 * 场面：一只只带「青草场地」与「冰旋」的冰系物攻手，对一只关掉 AI、血厚站定的铁傀儡。
 *   它会先铺下青草场地（地面出现真实场地），随后旋转冲进去，把场地刮掉、撞伤铁傀儡并留下冰面。
 *   本单元自检需要真实场地，因此这一批 smoke 额外传入 `content/moves/grassyterrain` 作为场地来源
 *   （会顺带跑一遍它自己的场景）；仅凭本单元时它也会正常旋出，只是没有场地可刮。
 * 必然事实：冰旋被提交过、施法者打出过伤害、地面出现过冰面租借（changedBlocks 变化）、
 *   场上战斗者接触过共享的场地身份（world_combat:status/grassyterrain）。
 *   具体刮掉了几片场地、冰面铺了几格属世界写入结果，写进 note。
 */
Smoke.scenario("icespinner", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mamoswine", level: 48, moves: ["grassyterrain", "icespinner"], at: [-4, 0, 0], properties: "nature=adamant" });
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
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/grassyterrain")
                || stage.hadMobEffect(foe, "world_combat:status/grassyterrain"), "a real terrain had touched a combatant");
            stage.note("grass came from the caster's own grassy terrain; the spin sweeps terrain out of its path and leases a short-lived ice trail on the ground. Which exact fields were dispelled is a world write the smoke API cannot read.", {
                casts: stage.casts("icespinner", caster),
                dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                changedBlocks: changed.length,
                stoodOnGrass: stage.hadMobEffect(caster, "world_combat:status/grassyterrain"),
                foeOnGrass: stage.hadMobEffect(foe, "world_combat:status/grassyterrain"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "ice spinner lands on the target within 90 s");
});
