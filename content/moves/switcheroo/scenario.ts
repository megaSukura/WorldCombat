/**
 * 掉包的可执行设计说明：一只速度较高的宝可梦对一只携带道具的目标贴身掠过去，双方手里各有一件。
 * 必然事实：本招被提交过（掠出并完成一次接触判定）。交换本身是确定行为（双方各持一件、宝可梦对宝可梦），
 * 但舞台接口不暴露持有物，故把「换了什么、落在哪」写进 note 供读轨迹判断。
 */
Smoke.scenario("switcheroo", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 30, moves: ["switcheroo"], item: "cobblemon:oran_berry", at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:poison_barb", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("switcheroo", caster) > 0; }, function () {
        stage.expect(stage.casts("switcheroo", caster) > 0, "掉包被放出来了");
        stage.note("双方各持一件、都是宝可梦：接触点应把两件持有物对调（持有物不被舞台接口读取，不写断言）。",
            { casts: stage.casts("switcheroo", caster), moved: stage.travelled(caster) });
        stage.done();
    }, "掉包掠出");
});
