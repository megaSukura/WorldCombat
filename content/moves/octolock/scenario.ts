/**
 * 蛸固 / octolock 的可执行设计说明。
 *
 * 场面：一只只会「蛸固」的八爪武师（Grapploct）与一只不会动、不会还手的铁傀儡相隔 3 格开战；夜晚、天晴。
 *   技能表里只有这一招，所以 AI 只会伸触手；威胁在考虑距离内，它会先缠住。
 * 必然事实：本招被提交过；目标带上共享身份 world_combat:status/octolock；目标移动速度被有界减速（降到约一半）。
 *   每拍「防御与特防各 −1 级」走的是能力阶梯：非宝可梦落到护甲属性，而原版护甲被注册为 0..30，读不到负值；
 *   所以勒紧只在 note 里说明。连接检查与勒紧已经分开：缠绕托管效果每 4 刻复查距离与通视，断线立刻收；
 *   缠线表现不设 stop，持续绷在两端，直到效果结束或被驱散。
 */
Smoke.scenario("octolock", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "grapploct", level: 35, moves: ["octolock"], at: [-3, 0, 0] });
    stage.setPp(caster, "octolock", 1);
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseFoe = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("octolock", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/octolock")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseFoe * 0.75;
    }, function () {
        stage.expect(stage.casts("octolock", caster) > 0, "octolock was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/octolock"), "the target carried the shared octolock identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseFoe * 0.75, "the tentacle slowed the target rather than pinning it");
        stage.note("the per-round Defence/Sp. Def drop is written to the native stage ladder (armour on a non-Pokemon, clamped to 0..30 so a negative read is not available), so it is not asserted; the bind effect re-checks distance and line of sight every 4 ticks and the continuous hold scene carries no stop, so the tentacle stays on the target instead of flashing per squeeze", {
            casts: stage.casts("octolock", caster),
            baseFoe: baseFoe,
            foeSpeed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            foeArmor: stage.attribute(foe, "minecraft:generic.armor"),
            trapped: stage.hasMobEffect(foe, "world_combat:status/trapped"),
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10
        });
        // 第二段：缠绕走完自己的时长（或提前挣断）后，本次的载体必须被精确撤掉、目标移速恢复。
        stage.until(1400, function () {
            return !stage.hasMobEffect(foe, "world_combat:status/octolock");
        }, function () {
            stage.expect(stage.casts("octolock", caster) === 1, "only one octolock was cast");
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/octolock"), "the octolock carrier was removed when the hold ended");
            stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") >= baseFoe - 0.001, "the target's movement recovered once the tentacle let go");
            stage.note("the hold ends by duration, squeeze limit or the short disconnect poll; the end handler only removes this cast's key-matched carrier", {
                speed: [baseFoe, stage.attribute(foe, "minecraft:generic.movement_speed")],
                casterAlive: caster.alive(), foeAlive: foe.alive()
            });
            stage.done();
        }, "the tentacle lets go");
    }, "the tentacle locks the target");
});
