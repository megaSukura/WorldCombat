/**
 * 戏法的可执行设计说明：一只特攻较高的宝可梦对一只携带道具的目标出手，双方手里各有一件。
 * 必然事实：本招被提交过，且平台上的原子事务把两件真实持有物对调——组件与物品 id 原样保留（舞台直接读得到双方持有物）。
 * 射程、视线与交换许可之外的随机因素不写断言。
 */
Smoke.scenario("trick", function (stage) {
    var caster = stage.pokemon({ species: "Kadabra", level: 30, moves: ["trick"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Gastly", level: 30, moves: ["tackle"], item: "cobblemon:poison_barb", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.heldItem(caster) === "cobblemon:poison_barb"; }, function () {
        stage.expect(stage.casts("trick", caster) > 0, "戏法被放出来了");
        stage.expect(stage.heldItem(caster) === "cobblemon:poison_barb", "施法者拿到了目标原本的持有物");
        stage.expect(stage.heldItem(foe) === "cobblemon:oran_berry", "目标拿到了施法者原本的持有物");
        stage.note("双方各持一件、都是宝可梦：心线拉直后原子事务把两件持有物对调，双方各是一件、组件随原始物品保留。",
            { casts: stage.casts("trick", caster), casterHeld: stage.heldItem(caster), foeHeld: stage.heldItem(foe) });
        stage.done();
    }, "戏法拉线换物");
});
