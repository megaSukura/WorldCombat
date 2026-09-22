/**
 * 电球 / electroball —— 可执行设计说明。
 *
 * 一句话：把「自己比对手快多少」充进一颗电团远投出去，自己越快这一发越沉。
 *
 * 场面：一只只会电球、速度极快的顽皮雷弹（40 级）站在 6 格外，对一只速度很慢、被点住的卡比兽（40 级，睡眠不动）。
 * 必然事实：本招被提交过、目标受到过伤害（电团撞实）。
 * 速度差载荷、暴击、是否飞空都是数值/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("electroball", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "electrode", level: 40, moves: ["electroball"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["tackle"], at: [0, 0, 0], status: "sleep" });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("electroball", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("electroball", caster) >= 1, "caster committed electroball");
            stage.expect(stage.damageTo(foe) > 0, "electroball dealt damage to the foe");
            stage.note("electroball scales on user speed / target speed; a fast electrode against a slow snorlax should sit near the top of the ladder", {
                casts: stage.casts("electroball", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "electroball lands within 60 s");
});
