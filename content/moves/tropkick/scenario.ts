/**
 * 热带踢 / tropkick —— 可执行设计说明。
 *
 * 一句话：一记自下而上、裹着南国热浪的挑踢，命中把目标顶开（挑飞式则挑到半空）、压低它的攻击，落点烧出焦痕。
 *
 * 场面：石头地面、晴夜。一只只会「热带踢」的甜冷美后（技能表只给这一招，AI 就只会用它）对上一只铁傀儡——
 *   铁傀儡血厚，能撑过这一脚，好让掉攻落到它的攻击属性上被读到。
 * 必然事实：热带踢被提交过；铁傀儡受到过伤害；铁傀儡的攻击属性在一次命中后下降。
 *   挑飞高度、焦痕半径、伤害数值与配置分支写进 note，供读轨迹判断。
 */
Smoke.scenario("tropkick", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var queen = stage.pokemon({ species: "tsareena", level: 34, moves: ["tropkick"], at: [-4, 0, 0], properties: "nature=adamant" });
    var golem = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    var baseAttack = stage.attribute(golem, "minecraft:generic.attack_damage");
    stage.hostile(queen, golem);
    stage.until(1500, function () {
        return stage.casts("tropkick", queen) >= 1 && stage.damageTo(golem) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("tropkick", queen) >= 1, "tsareena committed trop kick");
            stage.expect(stage.damageTo(golem) > 0, "the kick dealt damage to the target");
            stage.expect(stage.attribute(golem, "minecraft:generic.attack_damage") < baseAttack,
                "the kick lowered the target's attack attribute through the shared stat ladder");
            stage.note("trop kick is a short stepping kick that leaves a scorch ring on the ground and lowers Attack. Drive mode (default) shoves the target back; launch mode would lift it. Random parts: damage roll and crit.", {
                casts: stage.casts("tropkick", queen),
                baseAttack: Math.round(baseAttack * 100) / 100,
                attackNow: Math.round(stage.attribute(golem, "minecraft:generic.attack_damage") * 100) / 100,
                dealt: Math.round(stage.damageBy(queen) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(golem) * 10) / 10,
                travelled: Math.round(stage.travelled(queen) * 10) / 10,
                targetAlive: golem.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "trop kick lands on the target within 75 s");
});
