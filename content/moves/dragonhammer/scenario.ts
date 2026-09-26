/**
 * 龙锤 / dragonhammer —— 可执行设计说明。
 *
 * 一句话：一只老翁龙把整个身体抡起来当锤子，沿垂直弧自上而下砸在铁傀儡身上，铁傀儡挨到伤害并被砸得趔趄——移动速度属性被压下去。
 *
 * 场面：老翁龙带这一招，正对一只血厚、抗击退的铁傀儡——它打不死，用来核对「真实接触后砸得趔趄」这一确定行为，
 * 也保证一次抡砸不会把目标直接打没。招式选取为 `aim`，但本场有明确目标，落弧方向由它决定。
 *
 * 断言只取必然事实：这招被放过、铁傀儡挨到伤害、它身上出现过被砸趴身份、它的移动速度属性被压下去。
 * 具体被撞飞多远、暴击与砸趴时长写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonhammer", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "drampa", level: 50, moves: ["dragonhammer"], at: [-2.2, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [0.6, 0, 0] });
    var baseSpeed = stage.attribute(thick, "minecraft:generic.movement_speed");
    // 铁傀儡只作靶子：停掉它的 AI，免得它追着老翁龙打、把施法者逼退到射程外。
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.hostile(caster, thick);
    stage.until(1200, function () {
        return stage.casts("dragonhammer", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("dragonhammer", caster) >= 1, "drampa committed dragon hammer");
            stage.expect(stage.damageTo(thick) > 0, "the hammer blow hit the iron golem");
            stage.expect(stage.hadMobEffect(thick, "world_combat:status/knocked_down"), "the golem was knocked down");
            stage.expect(stage.attribute(thick, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the knockdown slowed the golem's movement speed");
            stage.note("how far the golem was hurled, the crit roll and the exact knockdown duration are positional/random", {
                casts: stage.casts("dragonhammer", caster),
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                thickTravelled: Math.round(stage.travelled(thick) * 10) / 10,
                speed: [baseSpeed, stage.attribute(thick, "minecraft:generic.movement_speed")],
                thickAlive: thick.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dragon hammer smashes and knocks down a target within 60 s");
});
