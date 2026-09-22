/**
 * 水之波动 / waterpulse 的可执行设计说明。
 *
 * 场面：只会水之波动的水伊布（Vaporeon）对两只挨得很近、只带跃起不会还手的卡比兽（Snorlax）。
 * 必然事实：本招被提交过（`stage.casts`）；主目标中珠受到过伤害；身旁的第二个目标也被荡开的水环扫到。
 * 混乱是原生 20% 概率（本单元 chance 公式）、回响圈数与耳鸣时长随速度与特攻变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("waterpulse", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Vaporeon", level: 40, moves: ["waterpulse"], at: [-4, 0, 0] });
    // 两只靶子挨在一起：水珠命中一只后，荡开的水环应扫到另一只。
    var near = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [3.5, 0, 0] });
    var far = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [4.6, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(900, function () {
        return stage.casts("waterpulse", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(far) > 0;
    }, function () {
        stage.expect(stage.casts("waterpulse", caster) > 0, "waterpulse was committed");
        stage.expect(stage.damageTo(near) > 0, "the water bead struck one foe");
        stage.expect(stage.damageTo(far) > 0, "the expanding water rings washed over the other foe nearby");
        stage.note("混乱是约 20% 的概率（waterpulse.chance），几圈水波、耳鸣多久由速度与特攻决定", {
            casts: stage.casts("waterpulse", caster),
            near: Math.round(stage.damageTo(near) * 10) / 10,
            far: Math.round(stage.damageTo(far) * 10) / 10,
            confusedNear: stage.hadMobEffect(near, "world_combat:status/confusion"),
            confusedFar: stage.hadMobEffect(far, "world_combat:status/confusion")
        });
        stage.done();
    }, "waterpulse lands and its rings reach the second foe");
});
