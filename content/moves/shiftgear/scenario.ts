/**
 * 换档的可执行设计说明。
 *
 * 场面：一只只会换档的齿轮组与一只敌人僵尸相隔 9 格开战。僵尸会走近；换档是自身强化，AI 会在威胁尚有距离时抢先换好挡。
 * 必然事实：本招被提交过；换挡后伙伴会朝威胁压上一小段（travelled > 0.5），把新速度用掉。
 * 攻速等级的提升舞台读不到原生能力等级，写进 note 供读轨迹判断。
 */
Smoke.scenario("shiftgear", function (stage) {
    var caster = stage.pokemon({ species: "Klang", level: 40, moves: ["shiftgear"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("shiftgear") > 0;
    }, function () {
        stage.expect(stage.casts("shiftgear") > 0, "shiftgear was committed");
        stage.after(48, function () {
            stage.note("shiftgear observations", {
                casts: stage.casts("shiftgear"),
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                health: Math.round(caster.health() * 10) / 10
            });
            stage.expect(stage.travelled(caster) > 0.5, "the shifted gear was used to close in");
            stage.done();
        });
    }, "shiftgear engages");
});
