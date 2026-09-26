/**
 * 音速拳 / machpunch 的可执行设计说明。
 *
 * 一句话：脚不动，拳头过隙——一记瞬发的直拳，拳锋先到、音爆后到；只在贴身一臂之内成立。
 *
 * 场面：一只只会音速拳的格斗系精灵（Machop，32 级）面对两格外的僵尸；设为夜晚，僵尸不会被日光灼烧，
 *   所以伤害只可能来自这一拳。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（贴着出拳打实）。
 *   起点偏差导致的挥空、暴击与具体落点是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("machpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machop", level: 32, moves: ["machpunch"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("machpunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("machpunch", caster) > 0, "mach punch was committed");
        stage.expect(stage.damageTo(foe) > 0, "the instant punch dealt damage");
        stage.note("the move itself never displaces the user; the recorded travel is the shared task walking into arm's reach. The strike is one instantaneous trace, so misses only happen when the zombie walks out of the short line.", {
            casts: stage.casts("machpunch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "mach punch lands on the zombie");
});
