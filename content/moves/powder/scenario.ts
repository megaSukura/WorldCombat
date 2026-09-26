/**
 * 粉尘 / powder 的可执行设计说明。
 *
 * 场面：晴天白天，施法者与对手被一圈带顶的石墙关在一个 7×7×4 的斗室里（免得野生 AI 走散、把对手带出投掷与
 *   引爆的距离之外）。只会「粉尘」的霸王花（vileplume，技能表只给这一招）对一只烈焰人（minecraft:blaze，
 *   它自己就会喷火球造成原生火伤害）开战，相隔四格；施法者只埋粉、不攻击，所以它身上不会因别的来源掉血。
 *
 * 必然事实：本招被提交过；烈焰人身上出现过共享身份 world_combat:status/powdered；烈焰人自己喷出火球造成
 *   第一笔对外火伤后，被自己的粉尘炸伤（damageTo(foe) > 0）。爆炸比例、粘附时长与尘粒数取决于施法者特攻
 *   与配置，写进 note 供读轨迹判断。
 */
Smoke.scenario("powder", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");
    // 一圈带顶的石墙把双方关在同一块斗室里，避免烈焰人飞远把火球打到射程之外。
    stage.fill([-3, 0, -3], [3, 3, -3], "minecraft:stone");
    stage.fill([-3, 0, 3], [3, 3, 3], "minecraft:stone");
    stage.fill([-3, 0, -3], [-3, 3, 3], "minecraft:stone");
    stage.fill([3, 0, -3], [3, 3, 3], "minecraft:stone");
    stage.fill([-3, 3, -3], [3, 3, 3], "minecraft:stone");

    var caster = stage.pokemon({ species: "vileplume", level: 45, moves: ["powder"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:blaze", at: [2, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1600, function () {
        return stage.casts("powder", caster) > 0
            && stage.hadMobEffect(foe, "world_combat:status/powdered")
            && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("powder", caster) > 0, "粉尘被放出来了");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/powdered"), "烈焰人身上贴上了粉尘");
            stage.expect(stage.damageTo(foe) > 0, "烈焰人自己的火攻引燃了粉尘并受到反噬");
            stage.note("引爆时机取决于烈焰人何时造成第一笔对外火伤；爆炸比例、粘附时长、投掷距离与尘粒数由特攻、速度、等级与体型公式决定。",
                { casts: stage.casts("powder", caster), foeDealt: Math.round(stage.damageBy(foe) * 10) / 10,
                  damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                  damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                  casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10 });
            stage.done();
        });
    }, "粉尘贴上并被烈焰人自己的火攻引爆");
});
