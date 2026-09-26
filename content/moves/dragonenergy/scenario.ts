/**
 * 巨龙威能 / dragonenergy 的可执行设计说明。
 *
 * 场面：一只只会巨龙威能的精灵站在平地，目标站在正前方 5 格、两格高的石台上（不还手）。
 * 龙息是前向 3D 锥，需要沿瞄准方向真的向上喷才够得到高台——这是本轮修正的核心。
 * 必然事实：本招被提交过；目标受到过伤害（龙息命中）。
 * 一喷贯穿几个、是否触发献祭、以及暴击，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonenergy", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 5, 8], "minecraft:air");
    stage.fill([5, 0, -1], [5, 1, 1], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Dragonite", level: 50, moves: ["dragonenergy"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [5, 2, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(900, function () {
        return stage.casts("dragonenergy") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("dragonenergy") > 0, "dragonenergy was committed");
        stage.expect(stage.damageTo(foe) > 0, "the dragon breath reached the raised target");
        stage.note("dragonenergy observations", { casts: stage.casts("dragonenergy"), onFoe: stage.damageTo(foe),
            casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10,
            foeY: Math.round(foe.position()[1] * 10) / 10 });
        stage.done();
    }, "dragonenergy lands");
});
