/**
 * 愤怒门牙 / superfang —— 可执行设计说明。
 *
 * 一句话：门牙量住目标后一口咬下，直接削去目标当前生命的一半（不退防、不看攻防），咬住一小会儿再松口。
 *
 * 场面：一只只会愤怒门牙的拉达（45 级）对一只只会跃起、厚血不还手的卡比兽（60 级）。卡比兽生命够厚，
 * 削半之后仍活着，能看到"按比例"的效果而不只是一击必杀。断言只取必然事实：这招被提交过、目标受到过伤害。
 * 具体削去多少（目标当前生命的一半）随目标当时血量变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("superfang", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "raticate", level: 45, moves: ["superfang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 60, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("superfang", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("superfang", caster) >= 1, "caster committed super fang");
            stage.expect(stage.damageTo(foe) > 0, "super fang severed the foe's HP");
            stage.note("severing is a fixed share, not a defence contest; the exact cut is half the target's HP at the moment of the bite", {
                casts: stage.casts("superfang", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAfter: Math.round(foe.health() * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "super fang lands on a foe within range");
});
