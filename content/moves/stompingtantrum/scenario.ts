/**
 * 跺脚 / stompingtantrum —— 可执行设计说明。
 *
 * 一句话：一只只会跺脚的宝可梦踩着地面，朝目标跺出一条地裂，缝上落地的敌人吃一记重脚。
 * 场面：Donphan（地面系，Lv40）只带跺脚，对一只血厚、抗击退拉满的铁傀儡。
 *   铁傀儡会贴上来，逼出「站在缝上吃一记、但不会被强抛」的场面；它血厚，能读出命中。
 * 断言只取必然事实：本招被跺出过、目标吃到过伤害。
 * 上抛走 hitImpulse、受原生抗击退/权限约束（铁傀儡抗击退拉满，位移大多来自它自己走动）；
 * 「上一次打空后翻倍」取决于是否先跺空，属时序结果；写进 note 供读轨迹判断。
 */
Smoke.scenario("stompingtantrum", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "donphan", level: 40, moves: ["stompingtantrum"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [4.0, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1400, function () {
        return stage.casts("stompingtantrum", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("stompingtantrum", user) > 0, "donphan stomped the ground");
            stage.expect(stage.damageTo(foe) > 0, "the fissure reached the grounded foe");
            stage.note("裂缝只在有地面支撑处延伸；上抛走 hitImpulse，铁傀儡抗击退拉满，位移大多来自它自己走动。单场里是否先跺空是时序结果，读轨迹里的 damageIn 判断。", {
                casts: stage.casts("stompingtantrum", user),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                grudge: stage.hadMobEffect(user, "world_combat:status/stompingtantrum"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the tantrum lands");
});
