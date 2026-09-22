/**
 * 力量互换的可执行设计说明：一只只会「力量互换」的凯西，对一只只会「健美」的腕力开战。
 * 腕力先给自己加上攻/特的等级阶梯，力量互换因此有东西可换；夹具用已有的 bulkup 单元，
 * 并每 15 刻重申一次敌对，让施术者持续把腕力读成威胁（自身增益动作会让对方丢掉原生目标，这是夹具细节）。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/powerswap 的交换窗口。
 * 换到的具体等级、窗口多长写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("powerswap", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kadabra", level: 40, moves: ["powerswap"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machop", level: 30, moves: ["bulkup"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    function rehost() { stage.hostile(caster, foe); stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.note("以 workup 之外的 bulkup 单元作夹具：腕力抬高攻/防，凯西因此有攻势可换。");
    stage.until(1200, function () {
        return stage.casts("powerswap", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/powerswap");
    }, function () {
        stage.expect(stage.casts("powerswap", caster) > 0, "力量互换被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/powerswap"), "交换窗口带上了共享身份");
        stage.note("腕力先用健美抬高攻势，凯西读到攻势优势后才换势；换到的等级与窗口长度写进 note 供读轨迹判断。",
            { casts: stage.casts("powerswap", caster), foeBulkup: stage.casts("bulkup", foe) });
        stage.done();
    }, "力量互换换势");
});
