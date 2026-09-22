/**
 * 贝壳刃 / razorshell —— 可执行设计说明。
 *
 * 一句话：亮出壳缘朝身前扫出一道宽弧，弧内的非友方各挨一记切斩，各自按几率被削掉防御并被溅湿。
 *
 * 场面：一只只会贝壳刃的双刃丸（40 级）对一只只会跃起、厚血不还手的卡比兽（60 级）。厚血目标让这一记
 * 宽弧有机会走完并可能被削甲。断言只取必然事实：这招被提交过、目标受到过伤害。
 * 削甲是否掷出、被溅湿、弧面里到底罩住几个人，是概率/站位结果，写进 note 供读轨迹判断。
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
            stage.note("the arc always carves everyone it reaches; the shave roll follows each hit. The count of targets caught depends on where they stand inside the fan.", {
                casts: stage.casts("razorshell", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                soaked: stage.hadMobEffect(foe, "world_combat:status/soaked"),
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "razor shell lands on a foe within range");
});
