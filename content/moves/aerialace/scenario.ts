/**
 * 燕返 / aerialace —— 可执行设计说明。
 *
 * 一句话：一步掠身而过，掠过的那条线就是刀路，所以刀必中；扫到的人挨刀，人落在对手身后。
 *
 * 场面：一只迅捷的斩击者对四格外的对手（掠袭距离之内，让它一步切到）。对手冻在原地，让提交时锁死的直线刀路
 * 真的穿过它。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、目标受过燕返伤害。刀数、暴击、是否穿过目标写进 note 供读轨迹判断。
 * 对手横移出刀路或被墙挡住时会掠空，这属于位置结果，由试玩检查，不在必然断言里。
 */
Smoke.scenario("aerialace", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 40, moves: ["aerialace"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "raticate", level: 25, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(1000, function () {
        return stage.casts("aerialace", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("aerialace", caster) >= 1, "caster committed aerial ace");
            stage.expect(stage.damageTo(foe) > 0, "aerial ace dealt damage to the foe");
            stage.note("cut count, crit, and whether the horizontal lane passed through the foe are positional/random", {
                casts: stage.casts("aerialace", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "aerial ace lands on a foe within 50 s");
});
