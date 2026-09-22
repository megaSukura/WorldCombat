/**
 * 高速移动 的可执行设计说明。
 *
 * 场面：一只只会「高速移动」的大比鸟与一只僵尸隔开 9 格、石质场地上开战。技能表里只有这一招，所以 AI 只能先松劲。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/agility 的轻身窗口。
 * 具体抬了几级速度、风爆半径多大、窗口多长，写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语，
 * 因此不断言级数；本招对宝可梦只写原生等级，不落到移动速度属性）。
 */
Smoke.scenario("agility", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeot", level: 34, moves: ["agility"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("agility", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/agility");
    }, function () {
        stage.expect(stage.casts("agility", caster) > 0, "agility was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/agility"), "the rush window carried the shared identity");
        stage.after(60, function () {
            stage.note("agility self-buff applied; the Speed stages are native and unreadable here, so only the window and cast count are judged", {
                casts: stage.casts("agility", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "agility engages");
});
