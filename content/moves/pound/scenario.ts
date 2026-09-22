/**
 * 拍击 / pound —— 可执行设计说明。
 *
 * 场面：一只只会拍击的轻型精灵（Rattata）贴身对一只僵尸；只在 1.6 格外，扇面罩得住。
 * 必然事实：本招被提交过；目标受到过伤害（正面拍中）。
 * 拍中几个、暴击、重拍式与快拍式的时序差异都是位置与随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("pound", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Rattata", level: 30, moves: ["pound"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1.6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("pound") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("pound") > 0, "pound was committed");
            stage.expect(stage.damageTo(foe) > 0, "the swat dealt damage");
            stage.note("pound observations", { casts: stage.casts("pound"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster) });
            stage.done();
        });
    }, "pound lands");
});
