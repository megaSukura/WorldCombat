/**
 * 清除浓雾 / defog 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会「清除浓雾」的大比鸟（pidgeotto，技能表只给这一招，AI 走控制路径）站在
 *   一只只会「反射壁」的引梦貘人（drowzee）与一只原版蠹虫之间：蠹虫是真实敌对生物、又打不痛人，让两只
 *   宝可梦都把它当成威胁——引梦貘人因此会给自己张壁，大比鸟因此有理由起风，且不会被打退。
 *   本场景把反射壁单元一起装配，引梦貘人才有可用的反射壁行为。
 *
 * 必然事实：本招被提交过；引梦貘人身上先出现过共享身份 world_combat:status/reflect，被风扫过后又出现过
 *   world_combat:status/defogged，并且圆内不再带着 reflect。破防/闪避级数、破绽时长与风丝数取决于
 *   精灵数据与配置，写进 note 供读轨迹判断。
 *
 * 依赖：本场景同时装配 content/moves/reflect（提供反射壁行为与效果）。
 */
Smoke.scenario("defog", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "pidgeotto", level: 35, moves: ["defog"], at: [-5, 0, 0] });
    var screen = stage.pokemon({ species: "drowzee", level: 30, moves: ["reflect"], at: [0, 0, 0] });
    var bug = stage.mob({ type: "minecraft:silverfish", at: [6, 0, 0] });
    stage.hostile(caster, screen);
    stage.hostile(caster, bug);
    stage.hostile(screen, bug);

    stage.until(1800, function () {
        return stage.casts("defog", caster) > 0
            && stage.hadMobEffect(screen, "world_combat:status/reflect")
            && stage.hadMobEffect(screen, "world_combat:status/defogged")
            && !stage.hasMobEffect(screen, "world_combat:status/reflect");
    }, function () {
        stage.expect(stage.casts("defog", caster) > 0, "清除浓雾被放出来了");
        stage.expect(stage.hadMobEffect(screen, "world_combat:status/reflect"), "引梦貘人身上先有反射壁身份");
        stage.expect(stage.hadMobEffect(screen, "world_combat:status/defogged"), "风圈把引梦貘人吹得门户大开");
        stage.expect(!stage.hasMobEffect(screen, "world_combat:status/reflect"), "反射壁被风整片抹掉");
        stage.note("清扫半径、破防/闪避级数、破绽时长与风丝数由速度、体宽、等级公式决定；引梦貘人会按冷却重张反射壁，这里读到的是至少一次成功的吹扫。",
            { casts: stage.casts("defog", caster), foeCastsReflect: stage.casts("reflect", screen),
              screenHealth: Math.round(screen.health() * 10) / 10 });
        stage.done();
    }, "清除浓雾抹掉了场上的屏障");
});
