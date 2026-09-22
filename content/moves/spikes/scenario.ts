/**
 * 撒菱 / spikes —— 可执行设计说明。
 *
 * 一句话：把一把碎片撒到敌人脚下的地面，插成一圈尖刺；站在圈里的敌人被扎、持续被扎，同一片地上再撒会叠层。
 *
 * 场面：物攻不低、会撒菱的盔甲鸟带这一招；对面是一只铁傀儡（贴地、走得慢，会留在刺圈里）。
 * 距离在射程内，AI 会把碎片撒到铁傀儡站的位置，铁傀儡当场踏进刺圈。
 *
 * 断言只取必然事实：这招被放过、踩在刺圈里的铁傀儡挨到伤害。层数、暴击、铁傀儡具体走到哪里写进 note。
 */
Smoke.scenario("spikes", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "skarmory", level: 40, moves: ["spikes"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1.5, 0, 0] });
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("spikes", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("spikes", caster) >= 1, "skarmory committed spikes");
            stage.expect(stage.damageTo(heavy) > 0, "the iron golem standing on the spikes was cut");
            stage.note("landing spot, layer count and crit rolls are positional/random; several casts may stack layers", {
                casts: stage.casts("spikes", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "spikes cuts a grounded foe within 30 s");
});
