/**
 * 薄雾球 / mistball —— 可执行设计说明。
 *
 * 一句话：把一团羽绒与雾的轻球抛出去，命中炸开一团雾，有一半机会把目标糊住、压特攻减速。
 *
 * 场面：一只只会薄雾球的沙奈朵（45 级）对一只凯西（25 级）。只给这一招，AI 就只会用它。断言只取必然事实：
 * 招式被提交过、目标受过伤害。缠身（约五成起）与弧线落点都是概率/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("mistball", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 45, moves: ["mistball"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "abra", level: 25, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("mistball", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("mistball", caster) > 0, "薄雾球被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "羽绒雾球打中了目标");
        stage.note("缠身（约五成起，随特攻与等级上升）是概率结果，只作记录；球走的是真实弧线、落点随目标走位变化，射程由独立参数决定。只有减速真的挂上时，目标身上才留下跟随它的贴身羽绒雾，驱散立即散。",
            { casts: stage.casts("mistball", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                downcast: stage.hadMobEffect(foe, "world_combat:status/downcast"), foeAlive: foe.alive() });
        stage.done();
    }, "薄雾球命中目标");
});
