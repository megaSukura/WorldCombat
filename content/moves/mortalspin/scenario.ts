/**
 * 晶光转转 / mortalspin —— 可执行设计说明。
 *
 * 一句话：旋身把缠在身上的束缚甩脱，再朝四周甩出有限几枚真实毒晶；只有真正碰到敌人的那枚才结算伤害并上毒。
 *
 * 场面：石头地面、晴空正午。一只只会「晶光转转」的 glimmora（技能表只给这一招，AI 就只会用它）对上一只被
 *   点住、不会还手也不会跑的 iron_golem（不是不死生物，可被上毒；身板大，毒晶更容易碰到）。双方敌对开战。
 * 必然事实：晶光转转被提交过、施法者对铁傀儡造成过伤害、铁傀儡身上出现过共享身份 `poison`（毒晶命中后 100%
 *   上毒）。剧毒式会改成 `toxic`；本场用默认的晶光式，断言毒身份。随机量（伤害、暴击、铁傀儡是否撑住）写进
 *   note。
 */
Smoke.scenario("mortalspin", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var spin = stage.pokemon({ species: "glimmora", level: 45, moves: ["mortalspin"], at: [-3, 0, 0], properties: "nature=adamant" });
    var dummy = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(spin, dummy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(1600, function () {
        return stage.casts("mortalspin", spin) >= 1 && stage.damageTo(dummy) > 0
            && stage.hadMobEffect(dummy, "world_combat:status/poison");
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("mortalspin", spin) >= 1, "glimmora committed mortal spin");
            stage.expect(stage.damageTo(dummy) > 0, "a real poison crystal dealt damage to the target");
            stage.expect(stage.hadMobEffect(dummy, "world_combat:status/poison"), "the target carried the shared poison identity");
            stage.note("mortal spin cures rooted / partiallytrapped / trapped / leechseed on the user, then scatters a limited ring of real poison crystals. Only a crystal that actually touches an enemy deals damage once and poisons it; a blocking block or an enemy out of the ring leaves it unhurt, and each enemy is hit at most once per cast. The iron golem is not undead, so poison applies. Random parts: damage roll, crit and whether the target survives.", {
                casts: stage.casts("mortalspin", spin),
                dealt: Math.round(stage.damageBy(spin) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(dummy) * 10) / 10,
                targetAlive: dummy.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "mortal spin poisons the target within 80 s");
});
