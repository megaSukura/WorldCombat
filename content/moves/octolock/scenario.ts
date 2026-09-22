/**
 * 蛸固 / octolock 的可执行设计说明。
 *
 * 场面：一只只会「蛸固」的八爪武师（Grapploct）与一只不会动、不会还手的铁傀儡相隔 3 格开战；夜晚、天晴。
 *   技能表里只有这一招，所以 AI 只会伸触手；威胁在考虑距离内，它会先缠住。
 * 必然事实：本招被提交过；目标带上共享身份 world_combat:status/octolock；目标移动速度属性掉到一半以下。
 *   每拍「防御与特防各 −1 级」走的是能力阶梯：非宝可梦落到护甲属性，而原版护甲被注册为 0..30，读不到负值；
 *   所以勒紧只在 note 里说明。server.log 里 octolock_bound 的持续时长每约一拍被刷新一次，正是每拍勒紧在跑。
 */
Smoke.scenario("octolock", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "grapploct", level: 35, moves: ["octolock"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseFoe = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("octolock", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/octolock")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseFoe * 0.5;
    }, function () {
        stage.expect(stage.casts("octolock", caster) > 0, "octolock was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/octolock"), "the target carried the shared octolock identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseFoe * 0.5, "the tentacle pinned the target in place");
        stage.note("the per-round Defence/Sp. Def drop is written to the native stage ladder (armour on a non-Pokemon, clamped to 0..30 so a negative read is not available), so it is not asserted; the repeated refresh of world_combat:octolock_bound every round in server.log shows the squeeze handler running", {
            casts: stage.casts("octolock", caster),
            baseFoe: baseFoe,
            foeSpeed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            foeArmor: stage.attribute(foe, "minecraft:generic.armor"),
            trapped: stage.hasMobEffect(foe, "world_combat:status/trapped"),
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10
        });
        stage.done();
    }, "the tentacle locks the target");
});
