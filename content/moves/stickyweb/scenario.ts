/**
 * 黏黏网 / stickyweb —— 可执行设计说明。
 *
 * 一句话：把黏丝抛到敌人脚下的地面摊成一张网，踏进去的贴地敌人速度掉一档、被网黏住；飞行的从上方过去。
 *
 * 场面：会黏黏网的电蜘蛛带这一招；对面是一只铁傀儡（贴地、走得慢，会留在网里）。
 * 网中心落在铁傀儡身上，铁傀儡当场被黏、移动速度被压。
 *
 * 断言只取必然事实：这招被放过、铁傀儡身上出现黏网身份、它的移动速度被压下去。
 * 网的具体落点与减速是否多降一级写进 note。
 */
Smoke.scenario("stickyweb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "galvantula", level: 40, moves: ["stickyweb"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("stickyweb", caster) >= 1 && stage.hadMobEffect(heavy, "world_combat:status/stickyweb");
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("stickyweb", caster) >= 1, "galvantula committed sticky web");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/stickyweb"), "the iron golem was snared in the web");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the web lowered the iron golem's movement speed");
            stage.note("landing spot and whether the anchored form adds a second stage are positional/config dependent", {
                casts: stage.casts("stickyweb", caster),
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                webbed: stage.hasMobEffect(heavy, "world_combat:status/stickyweb"),
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "sticky web snares a grounded foe within 30 s");
});
