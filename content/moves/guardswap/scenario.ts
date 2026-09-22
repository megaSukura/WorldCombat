/**
 * 防守互换的可执行设计说明：一只只会「防守互换」的凯西，对一只只会「健美」的腕力开战。
 * 腕力先给自己加上攻/防的等级阶梯，防守互换因此有东西可换；夹具用已有的 bulkup 单元，
 * 并每 15 刻重申一次敌对，让施术者持续把腕力读成威胁（自身增益动作会让对方丢掉原生目标，这是夹具细节）。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/guardswap 的交换窗口。
 * 换到的具体等级、窗口多长写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("guardswap", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kadabra", level: 40, moves: ["guardswap"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machop", level: 30, moves: ["bulkup"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    function rehost() { stage.hostile(caster, foe); stage.after(15, rehost); }
    stage.after(15, rehost);
    stage.until(1200, function () {
        return stage.casts("guardswap", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/guardswap");
    }, function () {
        stage.expect(stage.casts("guardswap", caster) > 0, "防守互换被放出来了");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/guardswap"), "交换窗口带上了共享身份");
        stage.note("腕力先用健美抬高守势，凯西读到守势优势后才换守；换到的等级与窗口长度写进 note 供读轨迹判断。",
            { casts: stage.casts("guardswap", caster), foeBulkup: stage.casts("bulkup", foe) });
        stage.done();
    }, "防守互换换守");
});
