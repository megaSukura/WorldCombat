/**
 * 冰砾 / iceshard 的可执行设计说明。
 *
 * 一句话：一只冰系宝可梦朝一只不会跑的铁傀儡高速掷出一枚冰砾，命中处瞬碎并把目标冻僵；地面不留下任何东西。
 *
 * 场面：只会冰砾的 Sneasel（34 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），晴天平地。
 * 必然事实：本招被提交过；目标受到过伤害；命中即挂上共享身份 world_combat:status/chill（冻僵）。
 *   冰碴量、飞了多远写进 note 供读轨迹判断；本招不替换地面方块，所以 changedBlocks 应保持为空。
 */
Smoke.scenario("iceshard", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Sneasel", level: 34, moves: ["iceshard"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("iceshard", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("iceshard", caster) > 0, "iceshard was committed");
            stage.expect(stage.damageTo(foe) > 0, "the shard dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/chill"), "a landed shard leaves the shared chill identity");
            stage.expect(stage.changedBlocks().length === 0, "the shard leaves no ice or block change behind");
            stage.note("chill is the shared freeze identity and lasts only a short while; this move replaces no ground blocks, so changedBlocks stays empty. Flight distance and splinter count are in the trace.", {
                casts: stage.casts("iceshard", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                chilled: stage.hadMobEffect(foe, "world_combat:status/chill"),
                changed: stage.changedBlocks().length,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "iceshard lands on a stationary foe and leaves no ice behind");
});
