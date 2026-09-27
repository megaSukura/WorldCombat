/**
 * 影子偷袭 / shadowsneak 的可执行设计说明。
 *
 * 一句话：本人不动，影子贴地朝提交方向爬出去，踩中第一只敌人后从它背侧上挑一刀；遇到实墙就停在墙前。
 *
 * 场面：一只只会影子偷袭的幽灵系精灵（Gastly，32 级）面对墙前的僵尸；墙后另站一只中立僵尸。
 *   设为夜晚，僵尸不会被日光灼烧，所以伤害只可能来自这一刀。
 * 必然事实：本招被提交过；墙前那只受到过伤害（影子爬到它身上后从背侧刺实）；墙后那只没有受到伤害
 *   （影子在第一只身上停下，也不穿墙）。影子推进途中的落空、暴击与具体落点写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowsneak", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    // 实墙（地板之上 3 格）：影子在第一只敌人身上就会停下，也不能穿过这堵墙。
    stage.fill([0, 0, -3], [0, 2, 3], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gastly", level: 32, moves: ["shadowsneak"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:zombie", at: [-1.5, 0, 0] });
    var far = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, near);
    stage.noai(near, far);
    stage.until(900, function () {
        return stage.casts("shadowsneak", caster) > 0 && stage.damageTo(near) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("shadowsneak", caster) > 0, "shadow sneak was committed");
            stage.expect(stage.damageTo(near) > 0, "the shadow blade dealt damage to the first enemy behind it");
            stage.expect(stage.damageTo(far) === 0, "the shadow did not pierce the wall to the enemy beyond");
            stage.note("the shadow crawls along the real ground in the committed direction, stops at the first non-friendly body it steps onto, and stabs it from behind; a wall or a cliff ends the crawl. The blade is placed on the victim's observed back side, never inside a wall.", {
                casts: stage.casts("shadowsneak", caster),
                onNear: Math.round(stage.damageTo(near) * 10) / 10,
                onFar: Math.round(stage.damageTo(far) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "shadow sneak strikes the first zombie and stops before the wall");
});
