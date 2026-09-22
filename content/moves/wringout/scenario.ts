/**
 * 绞紧 的可执行设计说明。
 *
 * 场面：一只只会绞紧的巨蔓藤（30 级）面对 3 格外的一只僵尸；技能表里只有这一招，所以 AI 只能用它。
 * 必然事实：本招被提交过；目标受到过伤害（绞中）。
 * 目标当时剩多少血、是否触发第二拧、被绞出的流光量，都是血量与命中结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("wringout", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tangrowth", level: 30, moves: ["wringout"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("wringout") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("wringout") > 0, "wringout was committed");
        stage.expect(stage.damageTo(foe) > 0, "the wring dealt damage");
        stage.note("wringout power is multiplied by 0.30 + 0.70 * target HP fraction, so the first wring on a healthy target is the heaviest. The twin form adds a second wring that recomputes against the target's HP at that moment.", {
            casts: stage.casts("wringout"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "wringout lands");
});
