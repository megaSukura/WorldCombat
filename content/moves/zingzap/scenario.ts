/**
 * 麻麻刺刺 / zingzap —— 可执行设计说明。
 *
 * 一句话：一边朝目标冲一边攒静电，撞上时把电一次放出，还可能跳向目标旁边的下一个人。
 *
 * 场面：会麻麻刺刺的顽皮雷弹站在平地一侧，前面两只挨着的小拉达——冲撞命中其一后，跳电有机会落到另一只身上。
 *
 * 断言只取必然事实：这招被放过；至少有一只小拉达挨到伤害（跳电与站位有关，不假设两只都中）。
 * 冲程攒了多少电、暴击、约 30% 的畏缩掷骰、跳电是否触发都写进 note 供读轨迹判断。
 */
Smoke.scenario("zingzap", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "togedemaru", level: 42, moves: ["zingzap"], at: [-4, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [3, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [4, 0, 2] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("zingzap", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("zingzap", caster) >= 1, "togedemaru committed zingzap");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the charged ram dealt damage");
        stage.note("the charge built over the run-up, crit, the flinch roll (about 30%) and whether the arc reached the other foe are random/positional", {
            casts: stage.casts("zingzap", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            firstFlinched: stage.hadMobEffect(first, "world_combat:status/flinch"),
            secondFlinched: stage.hadMobEffect(second, "world_combat:status/flinch"),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "zingzap lands on a foe within 45 s");
});
