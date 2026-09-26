/**
 * 影子偷袭 / shadowsneak 的可执行设计说明。
 *
 * 一句话：本人不动，影子贴地朝提交方向探出去，踩中第一只敌人后从它背侧刺一刀；遇到实墙就停。
 *
 * 场面：一只只会影子偷袭的幽灵系精灵（Gastly，32 级）面对三格外的僵尸；设为夜晚，僵尸不会被日光灼烧，
 *   所以伤害只可能来自这一刀。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（影子爬到它身上后从背侧刺实）。
 *   影子推进途中的落空、暴击、遇墙停下的位置与具体落点是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowsneak", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gastly", level: 32, moves: ["shadowsneak"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("shadowsneak", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("shadowsneak", caster) > 0, "shadow sneak was committed");
        stage.expect(stage.damageTo(foe) > 0, "the shadow blade dealt damage from behind");
        stage.note("the shadow crawls along the ground in the committed direction and stabs the first enemy that steps onto it from behind; it stops at solid walls and never pierces them. Misses only happen when nobody steps onto the shadow before it reaches its end.", {
            casts: stage.casts("shadowsneak", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "shadow sneak strikes the zombie from behind");
});
