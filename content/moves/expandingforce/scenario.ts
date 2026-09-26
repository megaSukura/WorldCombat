/**
 * 广域战力的可执行设计说明。
 *
 * 场面：一只只会「广域战力」的催眠貘（Drowzee）贴地面对一只被冻结的僵尸；石地打底、夜晚不燃烧，
 *   伤害只可能来自本招。场景里注册一片只用于工程验证的场地夹具 `world_combat:smoke/expandingforce_field`，
 *   它带与真场地相同的共享身份 `world_combat:terrain/psychicterrain`，成员在场地结束时挂一小段发光——
 *   正好用来证明「哪一片场地被真实识别并吸收了」。
 *
 * 定向事实：
 *   1. 同层脚下那一片场地被识别并吸收（施法者身上出现夹具的结束标记）；
 *   2. 楼上同 XZ 的另一片场地不触发、不被吸收（楼上的探针始终没有结束标记）；
 *   3. 隔墙同层的另一片场地不触发、不被吸收（墙后的探针始终没有结束标记）。
 *   4. 既有真实命中保留：目标受到过伤害。
 *   分层的纵向容差、命中与暴击的具体数值写进 note。
 */
const expandingforceSmokeField = "world_combat:smoke/expandingforce_field";
if (!WorldEffects.hasFieldRule(expandingforceSmokeField)) {
    WorldEffects.fieldRule(expandingforceSmokeField, {
        leave: function (world, actor) {
            MobEffects.apply(world, actor, "minecraft:glowing", 40, 0);
        }
    }, { identity: WorldEffects.terrain("psychicterrain"), tags: [WorldEffects.categories.terrain] });
}

Smoke.scenario("expandingforce", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-6, 3, -4], [-1, 3, 4], "minecraft:stone");
    stage.fill([-6, 0, 2], [-1, 2, 2], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "drowzee", level: 30, moves: ["expandingforce"], at: [-3, 0, -2] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [-0.5, 0, -2] });
    var upstairs = stage.mob({ type: "minecraft:zombie", at: [-3, 4, -2] });
    var behindWall = stage.mob({ type: "minecraft:zombie", at: [-3, 0, 3] });
    stage.noai(foe);
    stage.noai(upstairs);
    stage.noai(behindWall);
    stage.hostile(caster, foe);
    // 活体生成后过一小段才有可写作用域：三种几何各放一片夹具场地。
    stage.after(3, function () {
        stage.field(expandingforceSmokeField, [-3, 0, -2], 1200, 4, {}, caster);
        stage.field(expandingforceSmokeField, [-3, 4, -2], 1200, 5, {}, caster);
        stage.field(expandingforceSmokeField, [-3, 0, 3], 1200, 6, {}, caster);
    });
    stage.until(900, function () {
        return stage.casts("expandingforce", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("expandingforce", caster) >= 1, "广域战力被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "精神冲击打到了目标身上");
            stage.expect(stage.hadMobEffect(caster, "minecraft:glowing"), "同层脚下的场地被识别并吸收");
            stage.expect(!stage.hadMobEffect(upstairs, "minecraft:glowing"), "楼上同 XZ 的场地没有被吸收");
            stage.expect(!stage.hadMobEffect(behindWall, "minecraft:glowing"), "隔墙同层的场地没有被吸收");
            stage.note("夹具带共享身份 world_combat:terrain/psychicterrain：被本招吸收的场地会让成员发光。同一批场地下，只有同层、可见、脚底在半径内的那一片被吸收。命中率与暴击不写断言。", {
                casts: stage.casts("expandingforce", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                sameLayerConsumed: stage.hadMobEffect(caster, "minecraft:glowing"),
                upstairsConsumed: stage.hadMobEffect(upstairs, "minecraft:glowing"),
                behindWallConsumed: stage.hadMobEffect(behindWall, "minecraft:glowing"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "广域战力命中，且只吸收同层脚下那一片场地");
});
