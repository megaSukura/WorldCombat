/**
 * 闪电强袭 / supercellslam 的可执行设计说明。
 *
 * 场面：会闪电强袭的电击兽（Electabuzz）对一只只会跃起、不会还手的鲤鱼王，双方开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`）；施法者沿起跳—下压的路线移动过
 *   （`travelled > 0.3`，只统计水平位移，垂直停空不计入）。
 * AI 没有物理松键，同一动作在真实离地后自动有限释放（近敌 6 刻、远敌 12 刻）；靶子不躲，
 * 释放时按当前准线锁死落点，下坠本体扫到它，命中是稳定结果。
 * 落空自伤（crash）只在完全没有真实接触时出现；三档电荷与手动松手时机由玩家在游戏里验收。
 */
Smoke.scenario("supercellslam", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Electabuzz", level: 42, moves: ["supercellslam"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Magikarp", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("supercellslam", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("supercellslam", caster) > 0, "supercell slam was committed");
        stage.expect(stage.damageTo(foe) > 0, "the charged drop landed on the target");
        stage.expect(stage.travelled(caster) > 0.3, "the user moved along the hop-and-drop route");
        stage.note("AI auto-releases after a finite airborne hold, locking the landing only at release; with a stationary target the body sweep is a stable hit. Self-hurt only appears on a wholly empty drop (wall or untouched landing).", {
            casts: stage.casts("supercellslam", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "supercell slam lands on a foe");
});
