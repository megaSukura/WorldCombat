/**
 * 黏黏网 / stickyweb —— 可执行设计说明。
 *
 * 一句话：把黏丝抛到敌人脚下的地面摊成有实线和空隙的网；脚部真的踩到某条线带的贴地目标才会被黏住、速度下降。
 *
 * 场面：会黏黏网的电蜘蛛带这一招；对面是一只走向施法者的铁傀儡。网落在它前去的路上，它踏进外环／交叉黏线时
 *   被黏住、速度等级下降、移动速度被压低；随后冻住它，速度不应继续被往下扣。
 *
 * 断言只取必然事实：这招被放过、铁傀儡身上出现黏网身份、它的移动速度被压下去、站定不会继续扣级。
 *   网孔穿行、跳线、上下楼层不串触发、具体落点与是否多降一级写进 note。
 */
Smoke.scenario("stickyweb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "galvantula", level: 40, moves: ["stickyweb"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.setPp(caster, "stickyweb", 1);
    stage.until(1100, function () {
        return stage.casts("stickyweb", caster) >= 1 && stage.hadMobEffect(heavy, "world_combat:status/stickyweb");
    }, function () {
        stage.after(10, function () {
            var slowed = stage.attribute(heavy, "minecraft:generic.movement_speed");
            stage.expect(stage.casts("stickyweb", caster) >= 1, "galvantula committed sticky web");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/stickyweb"), "the golem stepping on a web line was snared");
            stage.expect(slowed < baseSpeed - 0.001, "the web lowered the golem's movement speed");
            stage.noai(heavy);
            stage.after(120, function () {
                var later = stage.attribute(heavy, "minecraft:generic.movement_speed");
                stage.expect(later >= slowed - 0.001, "the same web does not keep cutting the golem's speed");
                stage.note("only a body whose feet actually touch a clipped web line is snared; the outer ring is crossed by anything walking in, while gaps between lines are safe to step through or jump over. A body one layer up is not caught, and the Speed stage drops once per body per web. Landing spot, thread count, band width and whether the anchored form adds a stage are positional/config dependent.", {
                    casts: stage.casts("stickyweb", caster),
                    speed: [baseSpeed, slowed, later],
                    webbed: stage.hasMobEffect(heavy, "world_combat:status/stickyweb"),
                    heavyAlive: heavy.alive()
                });
                stage.done();
            });
        });
    }, "sticky web snares a grounded foe crossing a thread");
});
