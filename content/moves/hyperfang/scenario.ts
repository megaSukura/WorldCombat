/**
 * 必杀门牙 / hyperfang —— 可执行设计说明。
 *
 * 一句话：扑上去一口咬死，沿配置选定的一侧分 3 刻小步把目标晃开并钉住，甩得够狠就把它甩懵、打断它正在做的事。
 *
 * 场面：一只只会必杀门牙的拉达（45 级）对一只只会跃起、厚血不还手的卡比兽（60 级）；卡比兽生命够厚，
 * 经得起这一口并让"钉住"那段窗口真的走完。断言只取必然事实：这招被提交过、目标受到过伤害。
 * 畏缩是否掷出与扑空与否是概率/站位结果，写进 note 供读轨迹判断；侧甩方向现在由配置决定，不再随机。
 */
Smoke.scenario("hyperfang", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "raticate", level: 45, moves: ["hyperfang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 60, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("hyperfang", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("hyperfang", caster) >= 1, "caster committed hyper fang");
            stage.expect(stage.damageTo(foe) > 0, "hyper fang dealt damage to the foe");
            stage.note("the bite lands when the pounce connects; the sideways whip then runs in three small steps to the configured side, stopping at the real displacement, and only then rolls the flinch.", {
                casts: stage.casts("hyperfang", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "hyper fang lands on a foe within range");
});
