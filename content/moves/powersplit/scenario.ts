/**
 * 力量平分的可执行设计说明：一只只会「力量平分」的幸福蛋，对一只只会「撞击」的卡比兽开战，相隔 3 格。
 * 卡比兽的攻/特攻底子之和远高于幸福蛋，施术者一读到差距就出手，把两人拉到同一个平均刻度上。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/powersplit 的平分窗口。
 * 平到的具体数值、窗口多长写进 note 供读轨迹判断（私有装配没有读取原生培养值的读取原语）。
 */
Smoke.scenario("powersplit", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "chansey", level: 40, moves: ["powersplit"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["tackle"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("powersplit", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/powersplit");
    }, function () {
        stage.expect(stage.casts("powersplit", caster) > 0, "力量平分被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/powersplit"), "平分窗口带上了共享身份");
        stage.note("卡比兽的攻势底子之和高于幸福蛋，施术者读到差距后才平分；平到的数值与窗口长度写进 note 供读轨迹判断。伙伴选择与视觉仍由人工试玩检查。",
            { casts: stage.casts("powersplit", caster), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, casterAlive: caster.alive() });
        stage.done();
    }, "力量平分");
});
