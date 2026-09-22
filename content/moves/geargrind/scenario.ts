/**
 * 齿轮飞盘 / geargrind —— 可执行设计说明。
 *
 * 一句话：一只会齿轮飞盘的齿轮怪（L36，原生学习者）从 8 格外朝站桩的卡比兽甩出两枚旋转钢齿轮，齿轮扑上去咬到它。
 *
 * 场面：齿轮怪（klinklang）只会齿轮飞盘，卡比兽（snorlax）只会跃起、原地站桩，相隔 8 格——在射程内，
 *   齿轮怪不用先靠近就能甩出；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一枚齿轮的伤害（`stage.damageTo`）。
 *   两枚齿轮各自的命中/落空（原生命中 85 的翻译）、暴击、弹跳与落地齿轮的存在都是随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("geargrind", function (stage) {
    stage.fill([-14, -1, -10], [14, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "klinklang", level: 36, moves: ["geargrind"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 36, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("geargrind", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(100, function () {
            stage.expect(stage.casts("geargrind", caster) >= 1, "the caster committed geargrind");
            stage.expect(stage.damageTo(foe) > 0, "geargrind dealt damage to the foe");
            stage.note("each gear rolls its own deviation (the 85 accuracy translation) and may bounce off terrain instead of hitting", {
                casts: stage.casts("geargrind", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "geargrind lands a gear on a foe within 70 s");
});
