/**
 * 弹跳 / bounce —— 可执行设计说明。
 *
 * 一句话：蹲身压地后笔直弹起、在最高点短暂悬停（期间贴地近战够不着、身上挂着真实的凌空状态），
 * 再沿落点斜坠砸下，砸出接触伤害并有机会把目标麻住。
 *
 * 场面：头顶铺开一大片空气、晴空正午。一只只会「弹跳」的 pidgey（技能表只给这一招，AI 就只会用它）
 * 对上一只睡眠的 slowpoke（只带撞击）——睡眠让它停在原地，落点稳定可复现。开阔天空让高度吃满。
 *
 * 断言只取必然事实：这招被放过、落击的伤害落到目标身上、施法者确实沿空中轨迹移动过（竖直位移计入
 * travelled）、弹起期间身上出现过真实的 world_combat:bounce_airborne。命中/暴击、伤害量、目标撑不撑得住、
 * 这次落地有没有触发 30% 麻痹、飞了多高、悬停被远程打断与否，都随局面变化，写进 note。
 */
Smoke.scenario("bounce", function (stage) {
    // Open sky above the arena: bounce climbs only up to the first ceiling, so give it a tall clear column.
    stage.fill([-14, 0, -14], [14, 16, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var flier = stage.pokemon({ species: "pidgey", level: 30, moves: ["bounce"], at: [-2.0, 0, 0] });
    // A sleeping target stays put, so the locked landing stays over it while the user rises and hangs.
    var prey = stage.pokemon({ species: "slowpoke", level: 24, moves: ["tackle"], status: "sleep", at: [2.0, 0, 0] });
    stage.hostile(flier, prey);
    stage.until(1200, function () {
        return stage.casts("bounce", flier) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("bounce", flier) >= 1, "pidgey committed bounce");
            stage.expect(stage.damageTo(prey) > 0, "the falling body damaged the target");
            stage.expect(stage.travelled(flier) > 1, "bounce carried the user up and down the arc");
            stage.expect(stage.hadMobEffect(flier, "world_combat:bounce_airborne"), "the user carried the airborne status while off the ground");
            stage.note("the drop is a contact hit from the locked landing point; a target that walks out of it, or a roof that blocks the rise, makes it miss or hit light. Variables: damage roll and crit, whether the target survives, the height actually reached, whether the 30% paralysis triggered, and how many arcs it took to land one.", {
                casts: stage.casts("bounce", flier),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                flierTravelled: Math.round(stage.travelled(flier) * 10) / 10,
                flierAt: flier.position().map(function (n) { return Math.round(n * 10) / 10; }),
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyParalyzed: stage.hadMobEffect(prey, "world_combat:status/paralysis"),
                preyCasts: stage.casts("tackle", prey)
            });
            stage.done();
        });
    }, "bounce rises, hangs and drops on the target within 60 s");
});
