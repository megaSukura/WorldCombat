/**
 * 咬住 / bite 的可执行设计说明。
 *
 * 场面：只会咬住的小拉达（Rattata）对 2.2 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一口。僵尸停住不还手、抗击退拉满——新过程的拽回走原生受击位移 `hitDisplace`，
 * 完全抗推的身体应该只吃这一口的伤害、不被硬拽。
 * 必然事实：本招被提交过；目标受到过伤害（正面咬实）；抗击退的僵尸没有被强挪。
 * 是否掷出畏缩、拽回的具体落点、撞空还是咬中、暴击，都是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("bite", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Rattata", level: 30, moves: ["bite"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2.2, 0, 0] });
    stage.noai(foe);
    stage.command("attribute @e[type=minecraft:zombie,distance=..8,limit=1] minecraft:generic.knockback_resistance base set 1");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("bite", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("bite", caster) > 0, "bite was committed");
            stage.expect(stage.damageTo(foe) > 0, "the bite dealt damage even to a knockback-resistant body");
            stage.expect(stage.travelled(foe) < 0.5, "the knockback-resistant target was not hard-pulled");
            stage.note("the flinch roll, whether the pounce connected and crits are random/positional; the pull uses native hitDisplace, so a fully resistant body is only bitten, never dragged", {
                casts: stage.casts("bite", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "bite lands on a foe within range");
});
