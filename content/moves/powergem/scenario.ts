/**
 * 力量宝石 / powergem —— 可执行设计说明。
 *
 * 一句话：远处的宝石光线贯穿一条线，把站在线上的对手依次射穿。
 * 场面：一只放力量宝石的宝石海星对一只只挨打的宝可梦，双方都在开阔石地上、视线无遮挡。
 * 必然事实：本招被射出过、目标受到过伤害。贯穿人数与远端衰减是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("powergem", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "starmie", level: 45, moves: ["powergem"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machop", level: 30, moves: ["splash"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("powergem", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("powergem", caster) > 0, "power gem was fired");
        stage.expect(stage.damageTo(foe) > 0, "the ray damaged the target");
        stage.note("光线被方块挡住就止住，远端威力按远端保留衰减；贯穿到几个人取决于站位。", {
            casts: stage.casts("powergem", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "the ray lands");
});
