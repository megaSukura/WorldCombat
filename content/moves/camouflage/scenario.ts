/**
 * 保护色的可执行设计说明。
 *
 * 场面：一只只会保护色的变隐龙（等级 40）站在沙地上，对面 4 格外有一只只会走动的卡蒂狗（没有招式）。
 *   地面铺石头后单独在施法者脚下放一格沙，读地一定得到 ground；变隐龙是单属性普通，与 ground 不同，
 *   预检通过，AI 会在开战前后把这层颜色染上。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/camouflage 的标记
 *   （只有 types 层真正写入时才会挂上）。
 * 随机结果：染色的具体时机、读到的材质写进 note 供读轨迹判断。
 * 属性变化走共享 NativeModifiers types 层，smoke 不能直接读属性，实际读到的类型记在 note 里。
 */
Smoke.scenario("camouflage", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    stage.block([-2, -1, 0], "minecraft:sand");
    var caster = stage.pokemon({ species: "Kecleon", level: 40, moves: ["camouflage"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: kecleon(40) camouflage on a sand block; the ground reads as ground, which differs from its Normal type");
    stage.until(900, function () { return stage.hadMobEffect(caster, "world_combat:status/camouflage"); }, function () {
        stage.expect(stage.casts("camouflage", caster) >= 1, "camouflage was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/camouflage"), "the camouflage status appeared on the caster");
        stage.note("camouflage committed; the environment type is written through the shared NativeModifiers types layer (expected: ground from minecraft:sand)", {
            casts: stage.casts("camouflage", caster)
        });
        stage.done();
    }, "the coat is applied");
});
