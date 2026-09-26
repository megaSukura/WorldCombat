/**
 * 掉包的可执行设计说明：一只速度较高的宝可梦对一只携带道具、被冻住的目标贴身掠过去，双方手里各有一件。
 * 必然事实：本招被提交过，且掠过实际首碰的那具敌方身体时，平台原子事务把两件真实持有物对调（物品 id 原样保留）。
 * 目标不动，保证「真正撞上」这件事本身可重复；接触点、路径与随机因素写进 note 供读轨迹。
 */
Smoke.scenario("switcheroo", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 30, moves: ["switcheroo"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:poison_barb", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(900, function () { return stage.casts("switcheroo", caster) > 0; }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("switcheroo", caster) > 0, "掉包被放出来了");
            stage.expect(stage.heldItem(caster) === "cobblemon:poison_barb", "实际接触后施法者拿到目标原本的持有物");
            stage.expect(stage.heldItem(foe) === "cobblemon:oran_berry", "目标拿到了施法者原本的持有物");
            stage.note("双方各持一件、都是宝可梦：首碰的实际接触触发原子交换，物品不重复、不丢失。",
                { casts: stage.casts("switcheroo", caster), moved: stage.travelled(caster),
                  casterHeld: stage.heldItem(caster), foeHeld: stage.heldItem(foe),
                  casterAt: caster.position(), foeAt: foe.position() });
            stage.done();
        });
    }, "掉包掠出换物");
});
