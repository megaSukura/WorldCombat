/**
 * 叶绿爆震 / chloroblast 的可执行设计说明。
 *
 * 场面：会叶绿爆震的妙蛙花（Venusaur，草属性）在 3 格外、正前方扇形里摆两只被点住、不会还手的铁傀儡，
 * 晴天草地。两只都算敌人，锥形范围内一次罩住两个。
 * 必然事实：本招被提交过；扇形里的两个目标都受到过伤害；**施法者自己也受到过伤害**——自损是这一招的代价，
 * 与命中无关（靶子不还手，掉血只可能来自这一招自己）。
 * 命中率、暴击、边缘衰减与具体威力随个体数据浮动，写进 note 供读轨迹判断。
 */
Smoke.scenario("chloroblast", function (stage) {
    stage.fill([-12, -1, -10], [12, -1, 10], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Venusaur", level: 45, moves: ["chloroblast"], at: [-3, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var side = stage.mob({ type: "minecraft:iron_golem", at: [1.6, 0, 1.2] });
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..10] run data merge entity @s {NoAI:1b}");
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(1200, function () {
        return stage.casts("chloroblast", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(side) > 0
            && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("chloroblast", caster) > 0, "chloroblast was committed");
        stage.expect(stage.damageTo(near) > 0 && stage.damageTo(side) > 0, "the fan caught both bodies ahead");
        stage.expect(stage.damageTo(caster) > 0, "the user paid the proportional body cost");
        stage.note("扇形按到中心的距离衰减；自损固定为最大生命的 cost 比例（随特攻与特防浮动），与命中无关。命中率、暴击与两个目标的落点偏差会影响具体数值。", {
            casts: stage.casts("chloroblast", caster),
            onNear: Math.round(stage.damageTo(near) * 10) / 10,
            onSide: Math.round(stage.damageTo(side) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterHp: caster.health()
        });
        stage.done();
    }, "chloroblast fans out and the user pays with its chlorophyll");
});
