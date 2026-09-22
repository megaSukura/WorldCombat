/**
 * 日光束 / solarbeam 的可执行设计说明。
 *
 * 场面：夜晚、晴空，地面铺一条 5 格宽的草带（x −3..11、z −2..2）当作「光柱会晒焦的东西」。
 *   一只只会日光束的 Venusaur（L40）从 x=−3 起手，目标 Slowpoke（L30、睡眠、技能表只给撞击）背对草带站在 x=4。
 *   设成夜晚是为了让这招走「站定聚光」那一幕（强日光下会跳过聚光直接发射，那是另一条分支）。
 *
 * 必然事实：本招被提交过；光柱对目标造成了伤害；光柱犁过的草被换成焦土（changedBlocks 读到 minecraft:coarse_dirt）。
 *   另外核对「条件不成立」的一侧：先在弹道上立一堵石墙，视野被挡住时不应当起手；拆墙之后才应放出光柱。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、贯穿了几个、实际晒焦几格、焦土多久长回。
 *   「强日光下跳过聚光」这一条不在本场景覆盖范围内（需要白天直射），只在 note 说明。
 */
Smoke.scenario("solarbeam", function (stage) {
    stage.time("night");
    stage.weather("clear");
    // A grass strip under the firing line: the beam should scorch it into coarse dirt for a while.
    stage.fill([-3, -1, -2], [11, -1, 2], "minecraft:grass_block");
    // A wall across the firing line: line of sight is blocked, so the shared AI must not start the gather.
    stage.fill([1, 0, -12], [1, 4, 12], "minecraft:stone");
    var caster = stage.pokemon({ species: "venusaur", level: 40, moves: ["solarbeam"], at: [-3, 0, 0] });
    // A stationary punching bag: sleeping, so it stays on the line through the gather and the release.
    var target = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, target);
    // Condition-not-met side: while the wall stands, no beam may start.
    stage.after(70, function () {
        stage.expect(stage.casts("solarbeam", caster) === 0, "no beam was started with the wall blocking the line");
        stage.note("with the line blocked the caster held its gather", { casts: stage.casts("solarbeam", caster), casterTravelled: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.command("fill ~1 ~ ~-12 ~1 ~4 ~12 minecraft:air");
    });
    stage.until(1200, function () {
        return stage.casts("solarbeam", caster) >= 1 && stage.damageTo(target) > 0
            && stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:coarse_dirt"; }).length > 0;
    }, function () {
        var scar = stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:coarse_dirt"; });
        stage.expect(stage.casts("solarbeam", caster) >= 1, "venusaur committed solar beam");
        stage.expect(stage.damageTo(target) > 0, "the beam damaged the target on the line");
        stage.expect(scar.length > 0, "the beam scorched the grass along its path");
        stage.note("the night cast went through the standing gather before the beam. Random here: damage roll and crit, whether the slowpoke survives, how many bodies the beam pierced, how many grass cells were scorched, and when the scorch lease grows the grass back. The sunlight shortcut (instant release in strong sun) is not exercised by this night scenario.", {
            casts: stage.casts("solarbeam", caster),
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
            scorchedCells: scar.length,
            scorchedSample: scar.slice(0, 3),
            targetHealth: Math.round(target.health() * 10) / 10,
            targetAlive: target.alive()
        });
        // The scorch lease is scorchTicks (40..120) long; look once more after it should have grown back.
        stage.after(170, function () {
            var still = stage.changedBlocks().filter(function (cell) { return cell.after === "minecraft:coarse_dirt"; }).length;
            stage.note("after the scorch lease runs out the grass should have grown back unless a later beam scorched it again", {
                scorchedCellsNow: still,
                casts: stage.casts("solarbeam", caster)
            });
            stage.done();
        });
    }, "solar beam fires and scorches its path within 60 s");
});
