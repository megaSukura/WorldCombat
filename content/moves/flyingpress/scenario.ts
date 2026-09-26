/**
 * 飞身重压 / flyingpress —— 可执行设计说明。
 *
 * 一句话：跃到目标头顶再用整个身体压下来；这招同时算格斗与飞行两种属性、按自身体重结算，离地的目标被按到地面。
 *
 * 场面：会这招的摔角鹰人站在一只小敌前；把小敌冻住（native NoAI）以保证测试稳定——俯冲只允许一次校向，
 * 走位中的目标可能真的躲开，那是设计的一部分，不适合作为必然事实断言；小敌用撞击还手的那类随机留待试玩。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、施法者跃起过（travelled > 0）。
 * 双属性的乘积、暴击、撞墙/压空的差别写进 note 供读轨迹判断。
 */
Smoke.scenario("flyingpress", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hawlucha", level: 40, moves: ["flyingpress"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.noai(target);
    var castTick = 0;
    stage.until(1400, function () {
        if (castTick === 0 && stage.casts("flyingpress", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 45 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("flyingpress", caster) >= 1, "hawlucha committed flying press");
        stage.expect(stage.damageTo(target) > 0, "the press dealt damage");
        stage.expect(stage.travelled(caster) > 0.5, "the user leapt toward the target");
        stage.note("crit, the dual-type flying factor and whether the target was airborne (x1.2) are random/positional; the target is frozen so the locked dive reliably lands", {
            casts: stage.casts("flyingpress", caster),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            targetTravel: Math.round(stage.travelled(target) * 10) / 10,
            alive: target.alive()
        });
        stage.done();
    }, "flying press lands on a foe within 70 s");
});
