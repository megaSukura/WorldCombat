/**
 * 贝壳刃 / razorshell —— 可执行设计说明。
 *
 * 一句话：亮出壳缘、用外缘薄刃在身前扫过一道新月；只有站在外缘刃厚那一圈的非友方被切中，各自按几率被削防、被溅湿。
 *
 * 场面：一只只会贝壳刃的双刃丸（40 级）对一只只会跃起、厚血不还手的卡比兽（60 级）。厚血目标让这一记
 * 外缘有机会走完并可能被削甲。断言只取必然事实：这招被提交过、目标受到过伤害、切中者带上共享湿身身份。
 * 削甲是否掷出、新月外缘到底罩住几个人、贴得多近才被切到，是概率/站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("razorshell", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dewott", level: 40, moves: ["razorshell"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 60, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("razorshell", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("razorshell", caster) >= 1, "caster committed razor shell");
            stage.expect(stage.damageTo(foe) > 0, "razor shell carved the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the carved foe carried the shared soaked identity");
            stage.note("only the target standing inside the outer rim's thickness band is cut; the inner ring against the body is safe. The shave roll follows each hit and the water edge soaks every cut.", {
                casts: stage.casts("razorshell", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                soaked: stage.hadMobEffect(foe, "world_combat:status/soaked"),
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "razor shell lands on a foe standing on the outer rim");
});
