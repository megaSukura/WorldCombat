/**
 * 锁定 / lockon 的可执行设计说明。
 *
 * 场面：一只带着「锁定 + 撞击」的伊布对一只原版僵尸开战，隔开一段有视线的距离。技能表里的两招都由本仓库
 * 实现，AI 会先把准星咬上去，再出手把这次锁用掉。
 * 必然事实：锁定被提交过；目标身上出现过共享身份 world_combat:status/lockon 的咬住痕；目标的移动速度属性
 * 随之走低（钉住的效果）。实际钉住多久、何时兑现、是否打中由时机与共享结算决定，写进 note。
 */
Smoke.scenario("lockon", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "eevee", level: 30, moves: ["lockon", "tackle"], at: [-3, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseSpeed = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("lockon", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/lockon")
            && stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.01;
    }, function () {
        stage.expect(stage.casts("lockon", caster) > 0, "the lock was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/lockon"), "the target carried the shared lockon identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.01, "the target was dragged down while tracked");
        stage.after(200, function () {
            stage.note("锁定把锁定期挂在施法者、把咬住痕挂在目标身上，压低目标移动；下一次命中锁住的目标时由入场规则用掉并移除痕迹。是否兑现、打掉多少血、钉住多久由时机与本场决定，留给完整装配的人工试玩。锁窗口随等级与物攻、咬住时长随等级、准星数随物攻、距离随身高分别变化。", {
                casterCasts: stage.casts("lockon", caster),
                tackleCasts: stage.casts("tackle", caster),
                baseSpeed: baseSpeed,
                speedNow: stage.attribute(target, "minecraft:generic.movement_speed"),
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "lock-on drags the target down");
});
