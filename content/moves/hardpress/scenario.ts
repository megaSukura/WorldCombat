/**
 * 硬压 的可执行设计说明。
 *
 * 场面：一只只会硬压的铁螯龙虾（30 级）面对 3 格外的一只僵尸；技能表里只有这一招，所以 AI 只能用它。
 * 必然事实：本招被提交过；目标受到过伤害（下压命中）。
 * 命中时对方剩余多少血、压沉与顶开的位移、是否压住第二个目标，都是位置与命中结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("hardpress", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crawdaunt", level: 30, moves: ["hardpress"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("hardpress") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("hardpress") > 0, "hardpress was committed");
        stage.expect(stage.damageTo(foe) > 0, "the press dealt damage");
        stage.note("hardpress power is multiplied by 0.32 + 0.68 * target HP fraction, so the first press on a healthy target is the heaviest; later presses on a wounded target are lighter. Sink/shove travel and any second target are position results.", {
            casts: stage.casts("hardpress"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "hardpress lands");
});
