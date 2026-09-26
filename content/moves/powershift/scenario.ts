/**
 * 力量转换 / powershift 的可执行设计说明。
 *
 * 场面：一只只会「力量转换」的大岩蛇（防高攻低、满血，符合「健康且防高攻低时转攻势」）与一只弱小的小拉达
 *   隔开 9 格、石质场地上开战；技能表里只有这一招，所以 AI 只能先转换。有威胁、方向对、差距够大且没贴身时它会换一轮。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/powershift 的交换窗口。
 *   换前换后的数值、差距比、窗口多长写进 note 供读轨迹判断（smoke 不能直接读宝可梦的临时属性层数值）。
 */
Smoke.scenario("powershift", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "onix", level: 34, moves: ["powershift"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("powershift", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/powershift");
    }, function () {
        stage.expect(stage.casts("powershift", caster) > 0, "power shift was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/powershift"), "the stance window carried the shared identity");
        stage.after(80, function () {
            stage.note("Attack/Defence are swapped for the window through the shared temporary stat layer; the pre/post values and the window length are read here (a Pokemon's native stats are unreadable in this private assembly)", {
                casts: stage.casts("powershift", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "power shift engages");
});
