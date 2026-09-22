/**
 * 飞翔 / Fly —— 可执行设计说明。
 *
 * 一句话：起手蹲身后直上高空、悬停一下（期间贴地近战够不着、身上挂着真实的空中状态），再从目标头顶
 * 沿一条直线落下来，砸出接触伤害并把它向下压、向后推。
 *
 * 场面：头顶铺开一大片空气、晴空正午。一只只会飞翔的 pidgeot（技能表只给这一招，AI 就只会用它）
 * 对上一只睡眠的 slowpoke（只带撞击）——睡眠让它停在原地，落点稳定可复现。开阔天空让高度吃满，
 * 这一击最重；若把空气换成低矮的天花板，只会剩一次低跳。
 *
 * 断言只取必然事实：这招被放过、落击的伤害落到目标身上、施法者确实沿空中轨迹移动过（水平位移计入
 * travelled）、悬停期间身上出现过真实的 world_combat:fly_airborne。命中/暴击、伤害量、目标撑不撑得住、
 * 飞了多高、悬停被远程打断与否，都随局面变化，写进 note。
 */
Smoke.scenario("fly", function (stage) {
    // Open sky above the arena: fly climbs only up to the first ceiling, so give it a tall clear column.
    stage.fill([-14, 0, -14], [14, 16, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var flier = stage.pokemon({ species: "pidgeot", level: 34, moves: ["fly"], at: [-2.5, 0, 0] });
    // A sleeping target stays put, so the tracked landing stays over it while the user hovers.
    var prey = stage.pokemon({ species: "slowpoke", level: 24, moves: ["tackle"], status: "sleep", at: [2.5, 0, 0] });
    stage.hostile(flier, prey);
    stage.until(1200, function () {
        return stage.casts("fly", flier) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("fly", flier) >= 1, "pidgeot committed fly");
            stage.expect(stage.damageTo(prey) > 0, "the overhead drop damaged the target");
            stage.expect(stage.travelled(flier) > 1, "fly carried the user up and over to the landing");
            stage.expect(stage.hadMobEffect(flier, "world_combat:fly_airborne"), "the user carried the airborne status while hovering");
            stage.note("the drop is a contact hit from above; a target that walks out of the tracked spot before the dive, or ducks under a roof that blocks the descent line, makes it miss. Variables: damage roll and crit, whether the target survives, the height actually reached, and how many hovers it took to line up.", {
                casts: stage.casts("fly", flier),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                flierTravelled: Math.round(stage.travelled(flier) * 10) / 10,
                flierAt: flier.position().map(function (n) { return Math.round(n * 10) / 10; }),
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyCasts: stage.casts("tackle", prey)
            });
            stage.done();
        });
    }, "fly climbs, hovers and drops on the target within 60 s");
});
