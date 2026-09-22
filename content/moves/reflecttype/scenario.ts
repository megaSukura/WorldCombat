/**
 * 镜面属性的可执行设计说明。
 *
 * 场面：一只只会镜面属性的海星星（水属性，等级 40）对 4 格外的卡蒂狗（火属性，没有招式）。
 *   双方属性不同、都是宝可梦，预检通过；AI 会在看到威胁后照抄对手的属性。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/reflecttype 的标记
 *   （只有 types 层真正写入时才会挂上）。
 * 随机结果：照镜的具体时机、对手是否走动写进 note 供读轨迹判断。
 * 属性照抄走共享 NativeModifiers types 层，smoke 不能直接读属性，预期照到 fire 记在 note 里。
 */
Smoke.scenario("reflecttype", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Staryu", level: 40, moves: ["reflecttype"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: staryu(40, water) reflecttype vs growlithe(24, fire); the target's type is readable and differs");
    stage.until(1200, function () { return stage.hadMobEffect(caster, "world_combat:status/reflecttype"); }, function () {
        stage.expect(stage.casts("reflecttype", caster) >= 1, "reflecttype was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/reflecttype"), "the reflecttype status appeared on the caster");
        stage.note("reflecttype committed; the target's current type is written onto the caster through the shared NativeModifiers types layer (expected: fire)", {
            casts: stage.casts("reflecttype", caster)
        });
        stage.done();
    }, "the type is mirrored");
});
