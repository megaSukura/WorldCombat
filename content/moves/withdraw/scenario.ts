/**
 * 缩入壳中 的可执行设计说明。
 *
 * 场面：一只只会「缩入壳中」的杰尼龟（20 级）与一只被冻结的僵尸隔开 3 格、石质场地上开战；技能表里只有这一招。
 *   有威胁且在近身距离内时它会收进壳里，然后把一次真实敌对接触攻击交给壳挡。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/withdraw 的壳窗口；
 *   壳在身时用世界已有的 world_combat:rooted 把施法者钉住，移动速度属性降到基础值以下；
 *   首施后下一刻按次壳仍在（绑定在最终载体上），一次真实敌对接触攻击被整个挡下（damageTo 不增加）。
 *   挡了几次、壳何时开、最后清除一条 root 写进 note 供读轨迹判断。
 */
Smoke.scenario("withdraw", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 20, moves: ["withdraw"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    // 冻结僵尸：不让它在断言前自己耗掉按次壳，改由下面一条真实接触攻击确定性地验证。
    stage.noai(foe);
    stage.until(1000, function () {
        return stage.casts("withdraw", caster) > 0
            && stage.hasMobEffect(caster, "world_combat:status/withdraw")
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("withdraw", caster) > 0, "withdraw was committed");
        stage.expect(stage.hasMobEffect(caster, "world_combat:status/withdraw"), "the shell window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001,
            "the shell rooted the caster through the shared rooted effect");
        var before = stage.damageTo(caster);
        // 一条真实敌对接触攻击：壳仍绑在最终载体上，所以整个挡下，damageTo 不增加。
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(6, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the shell blocked the accepted hostile hit whole");
            stage.note("the shell shows one large petal per remaining block (count from level and the deep-shallow choice) and spends one whole-charge ward per accepted hostile attack; the shell and this cast's own root share the final carrier, so the last block opens the shell at once, releases only this cast's root and takes the Defence back; while shelled the G menu offers Open shell to end it early", {
                casts: stage.casts("withdraw", caster),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                damageBefore: before,
                damageAfter: stage.damageTo(caster),
                shellStillUp: stage.hasMobEffect(caster, "world_combat:status/withdraw"),
                alive: caster.alive()
            });
            stage.done();
        });
    }, "withdraw engages");
});
