/**
 * 背水一战 / noretreat 的可执行设计说明。
 *
 * 场面：一只只会「背水一战」的列阵兵（Falinks）与一只不会动、不会还手的铁傀儡相隔 4 格开战；夜晚、天晴。
 *   技能表里只有这一招，所以 AI 只会立誓；自身满血、威胁在考虑距离内，它会先顶满再迎战。
 * 必然事实：本招被提交过；术者带上共享身份 world_combat:status/noretreat；立誓后术者移动速度属性掉到一半以下。
 * 五项是否真的各升了一级（宝可梦写的是原生等级阶梯，不是 Minecraft 属性）写进 note。
 */
Smoke.scenario("noretreat", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "falinks", level: 35, moves: ["noretreat"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    var baseCaster = stage.attribute(caster, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(800, function () {
        return stage.casts("noretreat", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/noretreat")
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseCaster * 0.5;
    }, function () {
        stage.expect(stage.casts("noretreat", caster) > 0, "no retreat was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/noretreat"), "the caster carried the shared no-retreat identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseCaster * 0.5, "the oath pinned the caster in place");
        stage.note("the five stat boosts are written to the native stage ladder (not a Minecraft attribute), so they are not read here; the caster also carries the shared trapped identity while the oath lasts", {
            casts: stage.casts("noretreat", caster),
            baseCaster: baseCaster,
            casterSpeed: stage.attribute(caster, "minecraft:generic.movement_speed"),
            trapped: stage.hasMobEffect(caster, "world_combat:status/trapped"),
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10
        });
        stage.done();
    }, "no retreat is sworn");
});
