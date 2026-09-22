/**
 * 出奇一击 / feintattack —— 可执行设计说明。
 *
 * 一句话：闪到对手背后，贴着背打一记接触重拳；对手没在防那一侧，所以必中。
 *
 * 场面：一只只带出奇一击的阿勃梭鲁，对一只五格外的对手。场地铺平，白天晴天。
 * 断言只取必然事实：这招被提交过、对手受过出奇一击伤害。是否设了替身、闪现落点、暴击写进 note 供读轨迹判断。
 */
Smoke.scenario("feintattack", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "absol", level: 40, moves: ["feintattack"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "raticate", level: 30, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("feintattack", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(100, function () {
            stage.expect(stage.casts("feintattack", caster) >= 1, "caster committed feint attack");
            stage.expect(stage.damageTo(foe) > 0, "feint attack dealt damage to the foe");
            stage.note("blink landing and whether a decoy was placed are positional/config choices; crit is random", {
                casts: stage.casts("feintattack", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "feint attack lands on a foe within 50 s");
});
