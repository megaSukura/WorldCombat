/**
 * 铁滚轮 / steelroller —— 可执行设计说明。
 *
 * 一句话：把脚下的场地压碎，自己卷成钢轮碾出去；没有场地就整招失败。
 *
 * 场面：一只只带「铁滚轮」的佛烈托斯（50 级，另配一记「青草场地」用来先给自己铺一块地）对一只僵尸开战，
 *   时间设为夜晚（僵尸白天会自燃）。它会先把青草场地铺在脚下，站在草地上的它随即卷成钢轮滚出去，
 *   把草地压碎、撞伤僵尸。
 *   本单元自检只装配共享包与本单元，而草地是另一单元；为了让上面的链路真的跑起来，这一批 smoke 额外
 *   传入 `content/moves/grassyterrain` 作为场地来源（会顺带跑一遍它自己的场景）。
 * 必然事实：铁滚轮被提交过、施法者打出过伤害、真实场地接触过场上战斗者（共享身份 world_combat:status/grassyterrain）。
 *   草地是否在被压碎的那一瞬就已结束、钢辙是否真的铺开，属时序与世界写入结果，写进 note。
 */
Smoke.scenario("steelroller", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "forretress", level: 50, moves: ["grassyterrain", "steelroller"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1800, function () {
        return stage.casts("steelroller", caster) >= 1
            && (stage.hadMobEffect(caster, "world_combat:status/grassyterrain")
                || stage.hadMobEffect(foe, "world_combat:status/grassyterrain"));
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("steelroller", caster) >= 1, "forretress committed steel roller");
            stage.expect(stage.damageBy(caster) > 0, "the steel wheel dealt damage");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/grassyterrain")
                || stage.hadMobEffect(foe, "world_combat:status/grassyterrain"), "a real terrain had touched a combatant");
            stage.note("the terrain comes from the caster's own grassy terrain; steel roller ends the field it stands in. Without any terrain the move fails and spends PP, which is the configured guard on AI use. Whether this run also tore a furrow is a world write that stage.changedBlocks() cannot see.", {
                casts: stage.casts("steelroller", caster),
                dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                stoodOnGrass: stage.hadMobEffect(caster, "world_combat:status/grassyterrain"),
                foeOnGrass: stage.hadMobEffect(foe, "world_combat:status/grassyterrain"),
                stillOnGrass: stage.hasMobEffect(caster, "world_combat:status/grassyterrain"),
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "steel roller crushes the terrain and the zombie");
});
