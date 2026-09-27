// 蛛网的可执行设计说明：一只只会蛛网的宝可梦隔一段空地吐丝，裹住一只不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/trapped；目标移动速度属性随之下降。
// 分层（同一目标再中一次多缠一层、三层钉死）与「火把丝一次烧光」不是本场景的必然事实，写进 note。
Smoke.scenario("spiderweb", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "spinarak", level: 30, moves: ["spiderweb"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("spiderweb", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/trapped")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("spiderweb", caster) >= 1, "caster committed spider web");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the silk slowed the target's movement");
        stage.note("层数记在当前 carrier 的增幅等级里：移动/飞行属性与导航速度都用同一个『层数×本次 slow』（dynamicAttributes 跟随当前 carrier），第二层起各加一层、三层以上完全钉住。命中墙/地面时按实际碰撞面裁剪出贴面的薄网，失去支撑或被拆就退场；空射末点取真实弹体位置。任何火属性伤害或身上的火都会先判定、把整圈丝一次烧光——火判定完成前不会给接触者加层。这些分支不在本场景断言。", {
            casts: stage.casts("spiderweb", caster),
            baseSpeed: baseSpeed,
            speed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "spider web wraps the target");
});
