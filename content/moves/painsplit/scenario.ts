/**
 * 分担痛楚的可执行设计说明：一只生命较低的宝可梦只带本招，对一个生命更高的对手（4 格内）开战。
 * 目标血量高于自己，拉平就是净赚，AI 会在射程内尽早牵线；对手会自己走过来攻击。
 * 必然事实：本招被提交过。生命具体被分到多少取决于双方生命与取整，写进 note 供读轨迹判断；不写随机断言。
 */
Smoke.scenario("painsplit", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Abra", level: 20, moves: ["painsplit"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 40, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () { return stage.casts("painsplit", caster) > 0; }, function () {
        stage.expect(stage.casts("painsplit", caster) > 0, "分担痛楚被放出来了");
        stage.note("目标生命高于自己时拉平是净赚；双方生命应被拉向同一个平均值（至少各留 1 点）。",
            { casts: stage.casts("painsplit", caster), casterHp: Math.round(caster.health() * 10) / 10, foeHp: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "分担痛楚牵线");
});
