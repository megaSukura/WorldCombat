/**
 * 岩石炮的可执行设计说明。
 *
 * 场面：两只都会岩石炮的岩系（Rhyperior 对 Tyranitar）相隔 6 格开战，都只会这一招；脚下保留场地原本的地面材质，
 * 直接读「碎裂只扬尘、不改动地面方块」这一设计。
 * 必然事实：本招被提交过；巨石碎裂造成过伤害；施法者进入力竭（共享身份 mustrecharge）；地板方块始终未被改动；
 * 力竭期间无法再提交新动作。
 * 命中几人、顶开多远、落在哪里、力竭具体多长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("rockwrecker", function (stage) {
    var a = stage.pokemon({ species: "Rhyperior", level: 45, moves: ["rockwrecker"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "Tyranitar", level: 45, moves: ["rockwrecker"], at: [3, 0, 0] });
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("rockwrecker") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("rockwrecker") > 0, "rockwrecker was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "the shattered boulder dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster entered the spent window");
        stage.expect(stage.changedBlocks().length === 0, "the ground keeps its original material - the rubble is only a visual");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("rockwrecker", recharging);
        stage.note("rockwrecker exchange", { casts: stage.casts("rockwrecker"), onA: Math.round(stage.damageTo(a) * 10) / 10,
            onB: Math.round(stage.damageTo(b) * 10) / 10, changed: stage.changedBlocks().length });
        stage.after(12, function () {
            stage.expect(stage.casts("rockwrecker", recharging) === before, "no new action committed while spent");
            stage.done();
        });
    }, "rockwrecker lands");
});
