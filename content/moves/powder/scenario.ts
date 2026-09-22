/**
 * 粉尘 / powder 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地，施法者与对手被一圈三格高的石墙围在一个 9×9 的斗室里（免得野生 AI
 *   走散、把对手带出投掷与引爆的距离之外）。只会「粉尘」的霸王花（vileplume，技能表只给这一招）
 *   对一只只会「火花」的小火龙（charmander，招式全是火属性）开战，相隔四格；它会不断点火。
 *   施法者只埋粉、不攻击，所以它身上不会因别的来源掉血。
 *
 * 必然事实：本招被提交过；对手身上出现过共享身份 world_combat:status/powdered；对手在点火后被自己的
 *   粉尘炸伤（damageTo(foe) > 0）。爆炸比例、粘附时长与尘粒数取决于施法者特攻与配置，写进 note 供读轨迹判断。
 *
 * 依赖：本场景同时装配 content/moves/ember（提供对手的火花行为与威胁）。
 */
Smoke.scenario("powder", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");
    // 一圈石墙把双方关在同一块斗室里，避免野生走位把对手带出射程。
    stage.fill([-4, 0, -4], [4, 2, -4], "minecraft:stone");
    stage.fill([-4, 0, 4], [4, 2, 4], "minecraft:stone");
    stage.fill([-4, 0, -4], [-4, 2, 4], "minecraft:stone");
    stage.fill([4, 0, -4], [4, 2, 4], "minecraft:stone");

    var caster = stage.pokemon({ species: "vileplume", level: 45, moves: ["powder"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "charmander", level: 20, moves: ["ember"], at: [2, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1600, function () {
        return stage.casts("powder", caster) > 0
            && stage.hadMobEffect(foe, "world_combat:status/powdered")
            && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("powder", caster) > 0, "粉尘被放出来了");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/powdered"), "对手身上贴上了粉尘");
            stage.expect(stage.damageTo(foe) > 0, "对手点火时被自己的粉尘炸伤");
            stage.note("引爆时机取决于对手何时提交火招；爆炸比例、粘附时长、投掷距离与尘粒数由特攻、速度、等级与体型公式决定。",
                { casts: stage.casts("powder", caster), foeCastsEmber: stage.casts("ember", foe),
                  damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                  damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                  casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10 });
            stage.done();
        });
    }, "粉尘贴上并被点火引爆");
});
