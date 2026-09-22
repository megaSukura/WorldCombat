/**
 * 扫墓 / lastrespects —— 可执行设计说明。
 *
 * 一句话：为倒下的伙伴送行，走向对手落下这一扫；同阵营倒下的伙伴越多，这一扫越重。
 *
 * 场面：一只只会扫墓的怨影娃娃（35 级）在 14 格外；它身边（2 格外）站着一只同队的鸡，鸡与 4 格外的僵尸
 *   互为敌人——施法者走过来之前，鸡会被僵尸打倒，正好制造出「同阵营有一位伙伴倒下」的记录。
 *   施法者隔得远，所以它在路上要走上十几秒，给记录留出时间。
 * 必然事实：本招被提交过；对手挨到了这一扫。倒下伙伴数、是否带着记录出手、数值大小写进 note。
 * 记录不因这一扫清空，之后的扫墓继续吃同一份哀悼；随行式与送行式分别打走廊与单点。
 */
Smoke.scenario("lastrespects", function (stage) {
    stage.fill([-18, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "duskull", level: 35, moves: ["lastrespects"], at: [-14, 0, 0] });
    var ally = stage.mob({ type: "minecraft:chicken", at: [2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.team("pine", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(1100, function () {
        return stage.casts("lastrespects", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("lastrespects", caster) > 0, "duskull committed last respects");
            stage.expect(stage.damageTo(foe) > 0, "the mourning strike dealt damage");
            stage.note("the teammate chicken was meant to fall to the zombie before the caster arrived; the fallen count is what feeds the power term", {
                casts: stage.casts("lastrespects", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                allyAlive: ally.alive(),
                foeAlive: foe.alive(),
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "last respects lands on the foe within 55 s");
});
