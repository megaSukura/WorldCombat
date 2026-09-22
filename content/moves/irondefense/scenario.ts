/**
 * 铁壁 的可执行设计说明。
 *
 * 场面：一只只会「铁壁」的可多拉（Steel，34 级）与一只僵尸隔开 8 格、石质场地上开战。技能表里只有这一招。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/irondefense 的铁壳窗口；
 *   铁壳把击退抗性抬到基础值以上、把移动速度压到基础值以下（这两项写死在效果定义里，是「铁」的固定性质）。
 * 具体抬到多少、铁壳撑多久、防御等级抬了几级写进 note（私有装配没有读取原生能力等级的读取原语，因此不断言级数）。
 */
Smoke.scenario("irondefense", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lairon", level: 34, moves: ["irondefense"], at: [0, 0, 0] });
    var baseKnock = stage.attribute(caster, "minecraft:generic.knockback_resistance");
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("irondefense", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/irondefense")
            && stage.attribute(caster, "minecraft:generic.knockback_resistance") > baseKnock + 0.001
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("irondefense", caster) > 0, "iron defense was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/irondefense"), "the shell window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.knockback_resistance") > baseKnock + 0.001,
            "the iron shell raised knockback resistance");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001,
            "the iron shell weighed the caster down");
        stage.after(60, function () {
            stage.note("iron defense applied; Defense stages are native and unreadable here, so the shell's knockback resistance and weight are the judged riders", {
                casts: stage.casts("irondefense", caster),
                knockBefore: baseKnock,
                knockAfter: stage.attribute(caster, "minecraft:generic.knockback_resistance"),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "iron defense engages");
});
