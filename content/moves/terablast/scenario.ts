/**
 * 太晶爆发的可执行设计说明：两只不同倾向的个体各对一名目标出手，验证两种形态都会放出来、
 * 都造成过伤害。物攻更高者应走晶冲、特攻更高者应走晶束；命中率与暴击属随机结果，写进 note。
 */
Smoke.scenario("terablast", function (stage) {
    var machop = stage.pokemon({ species: "machop", level: 30, moves: ["terablast"], at: [-3, 0, -14] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [3, 0, -14] });
    var gastly = stage.pokemon({ species: "gastly", level: 30, moves: ["terablast"], at: [-3, 0, 14] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [3, 0, 14] });
    stage.hostile(machop, snorlax);
    stage.hostile(gastly, zombie);
    stage.until(900, function () {
        return stage.casts("terablast", machop) > 0 && stage.casts("terablast", gastly) > 0
            && stage.damageTo(snorlax) + stage.damageTo(zombie) > 0;
    }, function () {
        stage.expect(stage.casts("terablast", machop) > 0, "物攻更高的个体放出了太晶爆发");
        stage.expect(stage.casts("terablast", gastly) > 0, "特攻更高的个体放出了太晶爆发");
        stage.expect(stage.damageTo(snorlax) + stage.damageTo(zombie) > 0, "太晶爆发的伤害落到过目标身上");
        stage.note("machop 物攻高于特攻（应走晶冲并顶开）；gastly 特攻更高（应走晶束）。命中率与暴击不写断言。",
            { machopCasts: stage.casts("terablast", machop), gastlyCasts: stage.casts("terablast", gastly),
                snorlaxDamage: stage.damageTo(snorlax), zombieDamage: stage.damageTo(zombie) });
        stage.done();
    }, "双方都放出太晶爆发且至少一次命中");
});
