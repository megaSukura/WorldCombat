/**
 * 垃圾射击 / gunkshot —— 可执行设计说明。
 *
 * 一句话：把一大团垃圾压进身体当炮弹直线轰出去——物理重击、把目标顶开、可能中毒；炮弹带真实随机偏角可能打偏。
 * 命中只出一份结果；撞墙在墙面糊一次污，空飞在真实轨迹末端散落，不在准星点伪补。
 *
 * 场面：一只灰尘山带着这一招，站在 4 格外对一只慢吞吞的卡比兽开炮；距离近、偏角影响小，命中可复现。
 * 卡比兽用撞击还手。
 *
 * 断言只取必然事实：这招被放过、目标挨到过伤害。是否打偏（弹道随机偏角）、中毒（约 30% 的随机掷）与暴击写进 note。
 */
Smoke.scenario("gunkshot", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "garbodor", level: 42, moves: ["gunkshot"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "snorlax", level: 32, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1600, function () {
        return stage.casts("gunkshot", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("gunkshot", caster) >= 1, "garbodor committed gunk shot");
        stage.expect(stage.damageTo(target) > 0, "the garbage wad dealt damage");
        stage.note("one shell resolves once: an entity hit or a wall smear or a scatter at the real straight-run end; the random spread (a miss), the poison roll and crits are random", {
            casts: stage.casts("gunkshot", caster),
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hadMobEffect(target, "world_combat:status/poison"),
            targetMoved: Math.round(stage.travelled(target) * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "a gunk shot connects within 80 s");
});
