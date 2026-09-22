/**
 * 陀螺球 / gyroball —— 可执行设计说明。
 *
 * 一句话：站定旋成钢陀螺，把「对手比自己快多少」拧进转速，然后短促地撞上去；对手越快这一撞越沉。
 *
 * 场面：一只只会陀螺球、速度很慢的隆隆岩（45 级）对一只速度极快、被点住的顽皮雷弹（45 级，睡眠不动）。
 * 必然事实：本招被提交过、目标受到过伤害（陀螺撞实）。
 * 速度差载荷、暴击、撞空与否都是数值/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("gyroball", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 45, moves: ["gyroball"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "electrode", level: 45, moves: ["tackle"], at: [1, 0, 0], status: "sleep" });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("gyroball", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("gyroball", caster) >= 1, "caster committed gyroball");
            stage.expect(stage.damageTo(foe) > 0, "gyroball dealt damage to the foe");
            stage.note("gyroball scales on target speed / user speed; a slow golem against a very fast electrode should sit at a high load", {
                casts: stage.casts("gyroball", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "gyroball lands within 60 s");
});
