/**
 * 鳞射 / scaleshot 的可执行设计说明。
 *
 * 场面：只会鳞射的龙系精灵（Garchomp 40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   相隔 6 格。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害。发数（2～5，随物攻／速度／等级变化）、每片威力、散布与脱鳞后的
 *   速度提升／防御下降只写进 note，供读轨迹判断。
 */
Smoke.scenario("scaleshot", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "garchomp", level: 40, moves: ["scaleshot"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("scaleshot", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(45, function () {
            stage.expect(stage.casts("scaleshot", caster) > 0, "scaleshot was committed");
            stage.expect(stage.damageTo(foe) > 0, "the scale volley dealt damage to the foe");
            stage.note("the burst length (2-5 shards), per-shard power and spread follow Attack/Speed/level and the spray/聚鳞 choice, and the shed grants Speed +1 / Defense -1 (design facts verified in the full assembly)", {
                casts: stage.casts("scaleshot", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "scaleshot commits and its volley lands within 45 s");
});
