/**
 * 欢乐时光 / happyhour 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会「欢乐时光」的喵喵（meowth，技能表只给这一招）对一只会主动「火花」
 *   的小火龙（charmander）开战，相隔四格——对手会立刻点它，制造一个贴身威胁，并落在庆典半径之内。
 *
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/happyhour 的庆典光环。
 *   场地半径、光环时长、每次进项与金光数量由等级、体宽与亲密度公式决定；真正「圈内倒下一名非友方
 *   就落下真币」要等一次实际击杀，私有装配读不到掉落物，写进 note 供完整装配试玩核对。
 *
 * 依赖：本场景同时装配 content/moves/ember（提供对手的火花行为与威胁）。
 */
Smoke.scenario("happyhour", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "meowth", level: 35, moves: ["happyhour"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "charmander", level: 18, moves: ["ember"], at: [2, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1200, function () {
        return stage.casts("happyhour", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/happyhour");
    }, function () {
        stage.expect(stage.casts("happyhour", caster) > 0, "欢乐时光被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/happyhour"), "施法者身上出现了庆典光环");
        stage.after(120, function () {
            stage.note("光环持续、场地半径、每次进项与金光数量都是设计事实；此处只读得到施放与光环身份。",
                { casts: stage.casts("happyhour", caster), casterHealth: Math.round(caster.health() * 10) / 10,
                  damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10 });
            stage.done();
        });
    }, "欢乐时光铺开庆典");
});
