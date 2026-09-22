/**
 * 捏碎 的可执行设计说明。
 *
 * 场面：唯一学习者雷吉奇卡斯（50 级）面对 3 格外的一只僵尸；技能表里只有这一招，所以 AI 只能用它。
 * 必然事实：本招被提交过；目标受到过伤害（捏中）。
 * 目标当时剩多少血、是否触发高举与落地追加、被提起了多高，都是血量与位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("crushgrip", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "regigigas", level: 50, moves: ["crushgrip"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("crushgrip") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("crushgrip") > 0, "crushgrip was committed");
        stage.expect(stage.damageTo(foe) > 0, "the grip dealt damage");
        stage.note("crushgrip power is multiplied by 0.28 + 0.72 * target HP fraction; it is the heaviest, slowest move of the group. With hoist off (default) it is one grip; hoist on lifts the target, holds it, then slams it back for a fixed extra hit plus a short root.", {
            casts: stage.casts("crushgrip"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "crushgrip lands");
});
