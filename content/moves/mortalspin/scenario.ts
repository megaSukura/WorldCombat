/**
 * 晶光转转 / mortalspin —— 可执行设计说明。
 *
 * 一句话：旋身甩出一圈带毒的晶光，甩脱缠在身上的束缚，并让身周一圈的敌人中毒。
 *
 * 场面：石头地面、晴空正午。一只只会「晶光转转」的 glimmora（技能表只给这一招，AI 就只会用它）对上一只
 *   只带「撞击」的 slowpoke（非毒／钢属性，可被上毒）。
 * 必然事实：晶光转转被提交过、施法者对目标造成过伤害、目标身上出现过共享身份 `poison`（原生 100% 中毒）。
 *   剧毒式会改成 `toxic`；本场用默认的晶光式，断言毒身份。随机量（伤害、暴击、目标是否撑住）写进 note。
 */
Smoke.scenario("mortalspin", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var spin = stage.pokemon({ species: "glimmora", level: 45, moves: ["mortalspin"], at: [-3, 0, 0], properties: "nature=adamant" });
    var tank = stage.pokemon({ species: "slowpoke", level: 22, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(spin, tank);
    stage.until(1600, function () {
        return stage.casts("mortalspin", spin) >= 1 && stage.damageTo(tank) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("mortalspin", spin) >= 1, "glimmora committed mortal spin");
            stage.expect(stage.damageTo(tank) > 0, "the toxic spin dealt damage to the target");
            stage.expect(stage.hadMobEffect(tank, "world_combat:status/poison"), "the target carried the shared poison identity");
            stage.note("mortal spin cures rooted / partiallytrapped / trapped / leechseed on the user, sweeps a ring, and inflicts the shared poison identity on every enemy hit. Whether the foe could be poisoned depends on its type/ability, which this stage picks to be vulnerable. Random parts: damage roll and crit.", {
                casts: stage.casts("mortalspin", spin),
                dealt: Math.round(stage.damageBy(spin) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(tank) * 10) / 10,
                targetAlive: tank.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "mortal spin poisons the target within 80 s");
});
