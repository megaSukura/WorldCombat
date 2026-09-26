/**
 * 硬压 的可执行设计说明。
 *
 * 场面：一只只会硬压的铁螯龙虾（30 级）面对并排站在 6 格外的两只僵尸；技能表里只有这一招，所以 AI 只能用它。
 *   第 5 刻打开双腕式，掌面左右摊开，用来观察一次下压能不能罩住并排的目标。
 * 必然事实：本招被提交过；第一只目标受到过伤害（掌面压中）。
 * 命中时对方剩余多少血、压痕厚薄、第二只是否一起被压、压沉与顶开的位移，都是位置与命中结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("hardpress", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crawdaunt", level: 30, moves: ["hardpress"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var flank = stage.mob({ type: "minecraft:zombie", at: [3, 0, 1.2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, flank);
    stage.after(5, function () { stage.prefer(caster, "hardpress", { brace: true }); });
    stage.until(1200, function () {
        return stage.casts("hardpress") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("hardpress") > 0, "hardpress was committed");
        stage.expect(stage.damageTo(foe) > 0, "the press dealt damage");
        stage.note("hardpress power is multiplied by 0.32 + 0.68 * target HP fraction and the palm face is a short box in front, so the first press on a healthy target is heaviest and a target outside the face takes nothing. Brace widens the palm sideways only; both zombies being hit is positional. Sink/shove travel are position results.", {
            casts: stage.casts("hardpress"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToFlank: Math.round(stage.damageTo(flank) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive(), flankAlive: flank.alive()
        });
        stage.done();
    }, "hardpress lands");
});
