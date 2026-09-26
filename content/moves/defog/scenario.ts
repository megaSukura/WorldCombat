/**
 * 清除浓雾 / defog 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会「清除浓雾」的壶壶（shuckle，速度很低，风圈收在 4 格多，便于验证范围边界）
 *   站在一片本场景自建的护幕场地旁：场地用共享类别 screen 注册（每 5 刻给范围内活体刷一层 minecraft:glowing，
 *   作为真实、可观察、会被 defog 整实例掀掉的场贡献），一只被定住的蠹虫站在场地中央当被扫对象，另一只
 *   被定住的蠹虫站在风圈之外当对照。
 *
 * 必然事实：本招被提交过；圈内的蠹虫身上出现过共享身份 world_combat:status/defogged，圈外的没有；护幕被
 *   掀掉后不再刷新 minecraft:glowing（余效走完即无残留场贡献）。级数、时长与风丝数取决于精灵数据与配置，
 *   写进 note 供读轨迹判断。
 */
namespace PokemonSkills {
    // 测试夹具：一片声明为共享类别 screen 的护幕，给成员刷一层可观察的真实 MobEffect。
    WorldEffects.fieldRule("world_combat:defog_fixture", {
        stay: function (world, actor) { MobEffects.apply(world, actor, "minecraft:glowing", 12, 0); }
    }, { tags: [WorldEffects.categories.screen] });
}

Smoke.scenario("defog", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "shuckle", level: 20, moves: ["defog"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:silverfish", at: [0, 0, 0] });
    var far = stage.mob({ type: "minecraft:silverfish", at: [5, 0, 0] });
    stage.noai(near, far);
    stage.hostile(caster, near);
    stage.hostile(caster, far);

    // 护幕场地：成员会被刷新 minecraft:glowing，被掀掉后不再刷新。等场地来源稳定后再铺。
    stage.after(20, function () {
        stage.field("world_combat:defog_fixture", [0, 0, 0], 1200, 3, {}, near);
        stage.until(1800, function () {
            return stage.casts("defog", caster) > 0
                && stage.hadMobEffect(near, "world_combat:status/defogged")
                && stage.hadMobEffect(near, "minecraft:glowing")
                && !stage.hasMobEffect(near, "minecraft:glowing");
        }, function () {
            stage.expect(stage.casts("defog", caster) > 0, "清除浓雾被放出来了");
            stage.expect(stage.hadMobEffect(near, "world_combat:status/defogged"), "风圈把圈内的对手吹得门户大开");
            stage.expect(stage.hadMobEffect(near, "minecraft:glowing"), "护幕场地先给了圈内一层场贡献");
            stage.expect(!stage.hasMobEffect(near, "minecraft:glowing"), "护幕被掀掉后不再刷新场贡献");
            stage.expect(!stage.hadMobEffect(far, "world_combat:status/defogged"), "风圈之外的对手没有被扫到");
            stage.note("清扫半径、破防/闪避级数、破绽时长与风丝数由速度、体宽、等级公式决定；场地被整实例 dispel 后，余效走完即无残留。",
                { casts: stage.casts("defog", caster), nearDefogged: stage.hadMobEffect(near, "world_combat:status/defogged"),
                  farDefogged: stage.hadMobEffect(far, "world_combat:status/defogged") });
            stage.done();
        }, "清除浓雾掀掉场贡献并吹开门户");
    });
});
