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
        stage.note("缠身（约五成起，随特攻与等级上升）是概率结果，只作记录；球沿本招真实初速与重力解出的低/高弧飞出，射程按弧线实际路程预算，飞尽时在 projectilePosition 的真实末点散开。特攻等级下降（持久）与减速（有限 downcast 载体，驱散即恢复）各自独立结算；只有减速真的挂上才留下与载体同寿的贴身羽绒雾。",
            { casts: stage.casts("mistball", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                downcast: stage.hadMobEffect(foe, "world_combat:status/downcast"), foeAlive: foe.alive() });
        stage.done();
    }, "薄雾球命中目标");
});
