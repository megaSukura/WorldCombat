/**
 * 猛扑 / lunge —— 可执行设计说明。
 *
 * 一句话：把整个身体朝目标抛出去的一记跳扑，撞实后把目标顶开并压低它的攻击。
 *
 * 场面：石头地面、晴夜。一只只会「猛扑」的飞天螳螂（技能表只给这一招，AI 就只会用它）对上一只铁傀儡——
 *   铁傀儡目标大、血厚，够撑过这一记重撞，好让掉攻落到它的攻击属性上被读到。
 * 必然事实：猛扑被提交过；铁傀儡受到过伤害；铁傀儡的攻击属性在一次命中后下降
 *   （非宝可梦战斗者的能力等级落在 minecraft:generic.attack_damage 上，CombatStages）。
 *   伤害数值、暴击与配置分支写进 note，供读轨迹判断。
 */
Smoke.scenario("lunge", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var mantis = stage.pokemon({ species: "scyther", level: 30, moves: ["lunge"], at: [-4, 0, 0], properties: "nature=adamant" });
    var golem = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    var baseAttack = stage.attribute(golem, "minecraft:generic.attack_damage");
    stage.hostile(mantis, golem);
    stage.until(1500, function () {
        return stage.casts("lunge", mantis) >= 1 && stage.damageTo(golem) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("lunge", mantis) >= 1, "scyther committed lunge");
            stage.expect(stage.damageTo(golem) > 0, "the pounce dealt damage to the target");
            stage.expect(stage.attribute(golem, "minecraft:generic.attack_damage") < baseAttack,
                "the pounce lowered the target's attack attribute through the shared stat ladder");
            stage.note("lunge is a forward leap that ends the cast at the landing spot; the attack drop is one stage and lands on any combatant (here the iron golem's generic.attack_damage). Random parts: damage roll and crit.", {
                casts: stage.casts("lunge", mantis),
                baseAttack: Math.round(baseAttack * 100) / 100,
                attackNow: Math.round(stage.attribute(golem, "minecraft:generic.attack_damage") * 100) / 100,
                dealt: Math.round(stage.damageBy(mantis) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(golem) * 10) / 10,
                travelled: Math.round(stage.travelled(mantis) * 10) / 10,
                targetAlive: golem.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "lunge lands on the target within 75 s");
});
