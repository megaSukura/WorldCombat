/**
 * 电网 / electroweb —— 可执行设计说明。
 *
 * 一句话：把一张带电的网抛到目标所在处摊开，踏进网的敌人被电到、降速并被缠住，铁傀儡用来核对
 * 「移动速度属性被压下去」这条跨对象的效果。
 *
 * 场面：特攻不低、速度很快的电蜘蛛带这一招，站在两只并排的敌人前面；抛网落点在它们中间，
 * 逼出「网面一次罩住两个」的场面。铁傀儡移动慢，会留在网里。
 *
 * 断言只取必然事实：这招被放过、至少一只敌人挨到伤害、铁傀儡身上出现过缠身身份、铁傀儡的移动速度
 * 属性被压下去。命中随机与网络分布写进 note 供读轨迹判断。
 */
Smoke.scenario("electroweb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "galvantula", level: 40, moves: ["electroweb"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1.0, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1.8, 0, 0.9] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("electroweb", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(heavy, "world_combat:status/netted");
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("electroweb", caster) >= 1, "galvantula committed electroweb");
            stage.expect(stage.damageTo(foe) > 0, "the net jolted a foe");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:electrowebbed"), "the iron golem was caught in the net");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the net lowered the iron golem's movement speed");
            stage.note("where the net landed and the crit roll are positional/random", {
                casts: stage.casts("electroweb", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                netted: stage.hasMobEffect(heavy, "world_combat:status/netted"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "electroweb catches a foe within 30 s");
});
