/**
 * 龙箭 / dragondarts —— 可执行设计说明。
 *
 * 一句话：施法者放出两支会追踪的龙箭，至少一支命中一只对手并造成伤害。
 *
 * 场面：一只只会龙箭的多龙巴鲁托（dragapult，L40，原生学习者）与两只分列左右的铁傀儡开战，相隔约 7 格
 *   （在射程 9 内）。两只敌人在场，分头式下两箭各追一只；即使其中一只走位，追踪也应当至少命中一次。
 *
 * 断言只取必然事实：本招被提交过（`stage.casts`）、至少一只目标挨到伤害（`stage.damageTo`）。
 *   分头还是集火、两箭各追谁、暴击与命中时机都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragondarts", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dragapult", level: 40, moves: ["dragondarts"], at: [-3, 0, 0] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, -2] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 2] });
    var startLeft = stage.damageTo(left), startRight = stage.damageTo(right);
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.until(1000, function () {
        return stage.casts("dragondarts", caster) > 0
            && (stage.damageTo(left) > startLeft || stage.damageTo(right) > startRight);
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("dragondarts", caster) > 0, "dragapult committed dragon darts");
            stage.expect(stage.damageTo(left) > startLeft || stage.damageTo(right) > startRight, "at least one dart connected");
            stage.note("split vs focus, which dart chases which target, homing paths and crits are random/config results", {
                casts: stage.casts("dragondarts", caster),
                leftDamage: Math.round((stage.damageTo(left) - startLeft) * 10) / 10,
                rightDamage: Math.round((stage.damageTo(right) - startRight) * 10) / 10,
                leftAlive: left.alive(), rightAlive: right.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dragon darts strike a foe within 50 s");
});
