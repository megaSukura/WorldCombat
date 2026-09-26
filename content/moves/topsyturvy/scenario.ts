/**
 * 颠倒 / topsyturvy 的可执行设计说明。
 *
 * 场面：一只只会「颠倒」的乌贼王（Malamar）与一只不会动、不会还手的铁傀儡隔开 5 格开战；夜晚、天晴。
 *   开战前先给铁傀儡挂三级速度（一组可识别的成对药水），技能表里只有这一招，所以 AI 只会甩镜片。
 * 必然事实：本招被提交过；镜片命中真实对象后把速度换成同级的缓慢，并给目标带上共享身份 world_combat:status/inverted。
 *   没有可识别内容的空翻不会留下印记，也不会显示翻面——本场景用真实的成对药水覆盖有内容的一侧。
 */
Smoke.scenario("topsyturvy", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "malamar", level: 40, moves: ["topsyturvy"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.command("effect give " + foe.ref.split("/")[0] + " minecraft:speed 200 2 true");
    stage.until(700, function () {
        return stage.casts("topsyturvy", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/inverted");
    }, function () {
        stage.expect(stage.casts("topsyturvy", caster) > 0, "topsy-turvy was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/inverted"), "the struck target carried the shared inverted identity");
        stage.expect(stage.hasMobEffect(foe, "minecraft:slowness") && !stage.hasMobEffect(foe, "minecraft:speed"),
            "the paired Speed was flipped into an equal Slowness");
        stage.note("a recognised paired potion is reversed in place, keeping its strength and remaining time; the identical loop also negates stat stages, and a hit with nothing recognisable shows the shatter instead", {
            casts: stage.casts("topsyturvy", caster),
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10,
            marked: stage.hasMobEffect(foe, "world_combat:status/inverted"),
            slowness: stage.hasMobEffect(foe, "minecraft:slowness"),
            speed: stage.hasMobEffect(foe, "minecraft:speed")
        });
        stage.done();
    }, "the mirror flips the target");
});
