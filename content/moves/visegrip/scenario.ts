/**
 * 夹住 / visegrip —— 可执行设计说明。
 *
 * 一句话：一只巨钳蟹扑上一步，两只钳子从小拉达两侧合上碾一下并把它朝自己拽近，小拉达挨到伤害。
 *
 * 场面：巨钳蟹带这一招、钳口比目标大，正对一只皮薄的小拉达——两者距离落在钳夹距离内，用来核对
 * 「合上并结算接触伤害」这一确定行为；把目标拽近还会改变它的位置（`travelled` 会因此增加）。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、施法者还活着。具体拽近了多远、是否落空、暴击写进 note 供读轨迹判断。
 */
Smoke.scenario("visegrip", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kingler", level: 40, moves: ["visegrip"], at: [-2.0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [0.4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("visegrip", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("visegrip", caster) >= 1, "kingler committed vise grip");
            stage.expect(stage.damageTo(foe) > 0, "the pincers crushed the target");
            stage.expect(caster.alive(), "the caster survived the exchange");
            stage.note("how far the target was dragged in, whether any cast whiffed, the crit roll and the exact damage are positional/random", {
                casts: stage.casts("visegrip", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "vise grip clamps and damages a target within 45 s");
});
