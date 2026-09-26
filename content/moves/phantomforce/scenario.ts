/**
 * 潜灵奇袭 / phantomforce —— 可执行设计说明。
 *
 * 一句话：撕开影子裂隙滑进灵界、短暂消失（期间看不出也打不着、身上挂着真实的灵界状态），再从目标身后
 * 一处 freeSpace 认可的可站位置现身劈下；现身那一刻会把目标身上所有守护一并震碎，落点站不下或隔墙就只挥空。
 *
 * 场面：石头地面、晴空正午。一只只会「潜灵奇袭」的 gastly（技能表只给这一招，AI 就只会用它）对上一只
 * 睡眠的 slowpoke（只带撞击）——睡眠让它停在原地，落点稳定可复现，身后那片石头地也放得下 gastly。
 *
 * 断言只取必然事实：这招被放过、现身的一刀造成过伤害、消失期间身上出现过真实的 world_combat:phantomforce_veil。
 * 命中/暴击、伤害量、目标撑不撑得住、这次有没有真的震碎守护（本场景目标没有守护，碎护效果需人工试玩确认）、
 * 消失了几刻、落点被挡时会不会挥空，都随局面变化，写进 note。
 */
Smoke.scenario("phantomforce", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.fill([-12, 0, -12], [12, 12, 12], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var shade = stage.pokemon({ species: "gastly", level: 30, moves: ["phantomforce"], at: [-2.5, 0, 0] });
    var prey = stage.pokemon({ species: "slowpoke", level: 24, moves: ["tackle"], status: "sleep", at: [2.5, 0, 0] });
    stage.hostile(shade, prey);
    stage.until(1200, function () {
        return stage.casts("phantomforce", shade) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("phantomforce", shade) >= 1, "gastly committed phantom force");
            stage.expect(stage.damageTo(prey) > 0, "the reappearing strike damaged the target");
            stage.expect(stage.hadMobEffect(shade, "world_combat:phantomforce_veil"), "the user carried the veil status while vanished");
            stage.note("the strike lands at the target's locked position after the vanish; a target that walks out of it is missed. Guard-breaking needs a target that actually raised a guard, so this stage only shows the vanishing beat; variables: damage roll and crit, whether the target survives, and how many beats it took to land one.", {
                casts: stage.casts("phantomforce", shade),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                shadeTravelled: Math.round(stage.travelled(shade) * 10) / 10,
                shadeAt: shade.position().map(function (n) { return Math.round(n * 10) / 10; }),
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyCasts: stage.casts("tackle", prey)
            });
            stage.done();
        });
    }, "phantom force vanishes and strikes within 60 s");
});
