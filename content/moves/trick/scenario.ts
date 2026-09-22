/**
 * 戏法的可执行设计说明：一只特攻较高的宝可梦对一只携带道具的目标出手，双方手里各有一件。
 * 必然事实：本招被提交过（心线拉直、交换发生）。交换本身是确定行为（双方各持一件、宝可梦对宝可梦），
 * 但舞台接口不暴露持有物，故把「换了什么」写进 note 供读轨迹判断；命中与否则完全取决于射程与视线，不写随机断言。
 */
Smoke.scenario("trick", function (stage) {
    var caster = stage.pokemon({ species: "Kadabra", level: 30, moves: ["trick"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Gastly", level: 30, moves: ["tackle"], item: "cobblemon:poison_barb", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("trick", caster) > 0; }, function () {
        stage.expect(stage.casts("trick", caster) > 0, "戏法被放出来了");
        stage.note("双方各持一件、都是宝可梦：心线拉直时应把两件持有物对调（持有物不被舞台接口读取，不写断言）。",
            { casts: stage.casts("trick", caster) });
        stage.done();
    }, "戏法拉线");
});
