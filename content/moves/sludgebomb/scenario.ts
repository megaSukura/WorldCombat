/**
 * 污泥炸弹 / sludgebomb —— 可执行设计说明。
 *
 * 一句话：把一枚延时污泥炸弹丢到落点；动作掷完就结束，引信由挂在施法者身上的有限托管效果在**真实碰撞点**走完，
 * 然后爆心一圈一起挨伤、被推开、可能中毒。墙前落弹不会穿到墙后，飞行空放只安全散去。
 *
 * 场面：一只臭臭泥带着这一招，站在 5 格外对一只慢吞吞的卡比兽投弹；卡比兽走得慢，大概率留在爆心内，
 * 让"引信烧完→炸到"这条链可复现。卡比兽用撞击还手。
 *
 * 断言只取必然事实：这招被放过、目标挨到过爆心伤害——而这一击发生在施法动作结束之后（引信托管效果内）。
 * 引信期间是否走出爆心、中毒（约 30% 的随机掷）与暴击写进 note。
 */
Smoke.scenario("sludgebomb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "muk", level: 40, moves: ["sludgebomb"], at: [-5, 0, 0] });
    var target = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1400, function () {
        return stage.casts("sludgebomb", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("sludgebomb", caster) >= 1, "muk committed sludge bomb");
        stage.expect(stage.damageTo(target) > 0, "the fuse in the managed effect burst for damage after the throw ended");
        stage.note("the throw action ends when the shell hits; the fuse visual and the single burst are owned by a managed effect on the real impact point; staying inside the radius, the poison roll and crits are random/positional", {
            casts: stage.casts("sludgebomb", caster),
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hadMobEffect(target, "world_combat:status/poison"),
            targetMoved: Math.round(stage.travelled(target) * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "the fuse burns down on a foe within 70 s");
});
