/**
 * 聚宝功的可执行设计说明：让只会聚宝功的喵喵朝一名原版生物甩出一把金币，验证它被放出并打到目标。
 * 撒出的币数、落地真币枚数、命中/暴击都是随机或位置结果，写进 note 供读轨迹判断；
 * 真币以 `cobblemon:relic_coin` 落在地上（掉落不进入本场景的必然事实）。
 */
Smoke.scenario("payday", function (stage) {
    var meowth = stage.pokemon({ species: "meowth", level: 25, moves: ["payday"], at: [-6, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    stage.hostile(meowth, zombie);
    stage.until(900, function () { return stage.casts("payday", meowth) > 0 && stage.damageTo(zombie) > 0; }, function () {
        stage.expect(stage.casts("payday", meowth) > 0, "聚宝功被放出来了");
        stage.expect(stage.damageTo(zombie) > 0, "金币打到了目标身上");
        stage.note("撒出的币数、落地真币枚数与命中/暴击是随机或位置结果，只作记录；真币是落在落点的 cobblemon:relic_coin。",
            { casts: stage.casts("payday", meowth), damage: Math.round(stage.damageTo(zombie) * 10) / 10 });
        stage.done();
    }, "金币打到目标");
});
