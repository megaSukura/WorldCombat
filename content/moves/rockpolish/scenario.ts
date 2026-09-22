/**
 * 岩石打磨 的可执行设计说明。
 *
 * 场面：一只只会「岩石打磨」的大岩蛇与一只僵尸隔开 10 格、石质场地上开战。技能表里只有这一招，所以 AI 只能先打磨。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/polished 的光面窗口；
 *   脚下的石质地面被磨成了 smooth_stone（terrain 租借，到期还原）。
 * 具体抬了几级速度、火花与石粉数量、光面多长，写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语，
 * 因此不断言级数；本招对宝可梦只写原生等级）。
 */
Smoke.scenario("rockpolish", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "onix", level: 32, moves: ["rockpolish"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [10, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("rockpolish", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/polished")
            && stage.changedBlocks().some(function (b) { return b.after === "minecraft:smooth_stone"; });
    }, function () {
        stage.expect(stage.casts("rockpolish", caster) > 0, "rock polish was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/polished"), "the shine window carried the shared identity");
        stage.expect(stage.changedBlocks().some(function (b) { return b.after === "minecraft:smooth_stone"; }),
            "the stone ground under the caster was polished");
        stage.after(60, function () {
            stage.note("rock polish applied; Speed stages are native and unreadable here, the polished ground is the visible residue", {
                casts: stage.casts("rockpolish", caster),
                polishedBlocks: stage.changedBlocks().filter(function (b) { return b.after === "minecraft:smooth_stone"; }).length,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "rock polish engages");
});
