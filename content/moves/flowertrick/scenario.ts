/**
 * 千变万花的可执行设计说明：让会这一招的草系精灵对一只被点住、不会乱跑的厚实目标高抛一束花。
 * 必然事实：花束被抛出过；高弧落到目标身上并造成了伤害（这一击必定要害）。
 * 具体弧线高度、是否被掩体挡住、移动目标是否躲掉都属随机或环境结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("flowertrick", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowscarada", level: 40, moves: ["flowertrick"], at: [-6, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    // 偏好要在精灵真正可观察之后再写；否则刚生成的个体会被判定为尚未绑定。
    stage.after(2, function () { stage.prefer(caster, "flowertrick", { highArc: true }); });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("flowertrick", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flowertrick", caster) > 0, "flower trick was thrown");
        stage.expect(stage.damageTo(foe) > 0, "the high-arc bouquet reached the target and dealt damage");
        stage.note("花束锁定落点出手后不再追实体；高抛按可达范围里最高的解抛出，落到目标身上才绽开并强制要害（×1.5）。碰地、碰墙或碰友方只散瓣、不结算伤害，也不铺花地、不二爆。目标被点住不动，所以锁点落体命中；顶棚遮挡与移动目标躲掉留给完整装配试玩核对。", {
            casts: stage.casts("flowertrick", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(), casterAlive: caster.alive()
        });
        stage.done();
    }, "a high-arc bouquet reaches the target");
});
