/**
 * 疯狂植物的可执行设计说明。
 *
 * 场面：两只都会疯狂植物的草系（Venusaur 对 Torterra）相隔 6 格开战，都只会这一招；
 * 战前把两人脚下的整片场地表换成显眼的泥土，方便读「根须褪去后地面留下苔藓与生根土」。
 * 必然事实：本招被提交过；根须抽打造成过伤害；施法者进入力竭（共享身份 mustrecharge）；那块地的方块被换过；
 * 力竭期间无法再提交新动作。
 * 命中几人、是否缠住、力竭具体多长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("frenzyplant", function (stage) {
    var a = stage.pokemon({ species: "Venusaur", level: 45, moves: ["frenzyplant"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "Torterra", level: 45, moves: ["frenzyplant"], at: [3, 0, 0] });
    stage.fill([-5, -1, -3], [5, -1, 3], "minecraft:dirt");
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("frenzyplant") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("frenzyplant") > 0, "frenzyplant was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "the roots dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster entered the spent window");
        stage.expect(stage.changedBlocks().length > 0, "the ground where the roots grew was replaced");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("frenzyplant", recharging);
        stage.note("frenzyplant exchange", { casts: stage.casts("frenzyplant"), onA: Math.round(stage.damageTo(a) * 10) / 10,
            onB: Math.round(stage.damageTo(b) * 10) / 10, changed: stage.changedBlocks().length,
            changedSample: stage.changedBlocks().slice(0, 3) });
        stage.after(12, function () {
            stage.expect(stage.casts("frenzyplant", recharging) === before, "no new action committed while spent");
            stage.done();
        });
    }, "frenzyplant lands");
});
