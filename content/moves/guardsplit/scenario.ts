/**
 * 防守平分的可执行设计说明：一只只会「防守平分」的幸福蛋，对一只只会「撞击」的壶壶开战，相隔 3 格。
 * 壶壶的防/特防底子之和远高于幸福蛋，施术者一读到差距就出手，把两人拉到同一个平均厚度上。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/guardsplit 的平分窗口。
 * 平到的具体数值、窗口多长写进 note 供读轨迹判断（私有装配没有读取原生培养值的读取原语）。
 */
Smoke.scenario("guardsplit", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "chansey", level: 40, moves: ["guardsplit"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "shuckle", level: 45, moves: ["tackle"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("guardsplit", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/guardsplit");
    }, function () {
        stage.expect(stage.casts("guardsplit", caster) > 0, "防守平分被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/guardsplit"), "平分窗口带上了共享身份");
        stage.note("壶壶的守势底子之和高于幸福蛋，施术者读到差距后才平分；平到的数值与窗口长度写进 note 供读轨迹判断。",
            { casts: stage.casts("guardsplit", caster), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, casterAlive: caster.alive() });
        stage.done();
    }, "防守平分");
});
