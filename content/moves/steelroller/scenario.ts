/**
 * 铁滚轮 / steelroller —— 可执行设计说明。
 *
 * 一句话：把脚下的一整片场地压碎、颜色卷进轮身，自己卷成钢轮沿实际路径碾出去；没有场地就整招失败。
 *
 * 场面：一只只带「铁滚轮」的坚果哑铃（Ferrothorn，50 级，贴地）对一只被冻结的僵尸开战。本场景没有别的
 *   场地单元可依赖，就在场景里注册一片只用于工程验证的场地夹具 `world_combat:smoke/steelroller_terrain`：
 *   它带共享的 `world_combat:category/terrain` 标签，所以铁滚轮会把它当成脚下场地吃；成员踩上去挂一小段
 *   减速，场地结束时成员挂一小段发光——正好用来证明「场地真实存在过」和「确实被吃掉了」。
 * 必然事实：铁滚轮被提交过、僵尸受过伤、施法者身上出现过场地接触与场地结束两种效果。
 *   滚过的轨迹、钢屑、命中上限与颜色都写进 note。
 */
const steelrollerSmokeTerrain = "world_combat:smoke/steelroller_terrain";
if (!WorldEffects.hasFieldRule(steelrollerSmokeTerrain)) {
    WorldEffects.fieldRule(steelrollerSmokeTerrain, {
        stay: function (world, actor) {
            var body = world.observe(actor);
            if (body !== null && body.grounded()) MobEffects.apply(world, actor, "minecraft:slowness", 40, 0);
        },
        leave: function (world, actor) {
            MobEffects.apply(world, actor, "minecraft:glowing", 30, 0);
        }
    }, { identity: WorldEffects.terrain("smoke"), tags: [WorldEffects.categories.terrain] });
}

Smoke.scenario("steelroller", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "ferrothorn", level: 50, moves: ["steelroller"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    // 场景夹具在生成后的下一小段再落：刚生成的活体要在世界里过一次 tick 才拿到可写作用域。
    stage.after(20, function () {
        stage.field(steelrollerSmokeTerrain, [0, 0, 0], 1200, 6, {}, caster);
    });
    stage.until(1800, function () {
        return stage.casts("steelroller", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("steelroller", caster) >= 1, "ferrothorn committed steel roller");
            stage.expect(stage.damageTo(foe) > 0, "the steel wheel dealt damage");
            stage.expect(stage.hadMobEffect(caster, "minecraft:slowness"), "the terrain really touched the caster");
            stage.expect(stage.hadMobEffect(caster, "minecraft:glowing"), "the terrain underfoot was consumed");
            stage.note("the terrain is a smoke fixture carrying the shared world_combat:category/terrain tag; steel roller ends the field it stands in and takes its colour. Without any terrain the move fails and spends PP (the configured guard on AI use). The hit cap follows the crushed terrain count, so one terrain means one target; the roll-through, the shavings on the real path and the colour are world/particle writes the trace shows.", {
                casts: stage.casts("steelroller", caster),
                dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                terrainTouched: stage.hadMobEffect(caster, "minecraft:slowness"),
                terrainConsumed: stage.hadMobEffect(caster, "minecraft:glowing"),
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "steel roller crushes the terrain and the zombie");
});
