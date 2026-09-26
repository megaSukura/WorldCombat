/**
 * 破音 / overdrive —— 可执行设计说明。
 *
 * 一句话：从当下位置朝瞄准方向连拨三下，每一下都沿走廊推出带电的轰响；开余响时，第三拨那条声路会被留下，
 *   动作收束之后隔一段在原位置重放一记更重的迟到声浪。
 *
 * 场面：白天晴天、石地。只带破音的颤弦蝾螈站在一侧，正前方一只小敌被冻住（native NoAI）、开战。出生时先
 *   把这招 PP 扣到 0，等偏好写入后再给回 1 点：这样这一轮只会有一次三段，而且余响一定真的开启；走廊上的
 *   敌人不会自己走开，三下与余响都必须各留下一次伤害回执——第四笔回执就是「动作结束后，托管声路在原位置
 *   重放」的必然结果。
 *
 * 断言只取必然事实：破音被放过、敌人挨到伤害、回执数 >= 4（三下 + 一记余响）。
 *   被推多远、暴击与 4–20% 麻痹是否触发写进 note；余响不会转向新目标，这一点由「固定在原走廊」的结构保证。
 */
Smoke.scenario("overdrive", function (stage) {
    stage.fill([-9, -1, -7], [11, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "toxtricity", level: 45, moves: ["overdrive"], at: [0, 0, 0] });
    var near = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [4.0, 0, 0.0] });
    stage.hostile(caster, near);
    stage.noai(near);
    // 偏好/PP 要等绑定 announce 之后再写；先清空 PP，免得首发在偏好落地前就拨出去。
    stage.setPp(caster, "overdrive", 0);
    stage.after(5, function () {
        stage.prefer(caster, "overdrive", { echo: true });
        stage.setPp(caster, "overdrive", 1);
        stage.until(1200, function () {
            return stage.casts("overdrive", caster) >= 1 && stage.hits(near, true) >= 4;
        }, function () {
            stage.after(1, function () {
                stage.expect(stage.casts("overdrive", caster) >= 1, "toxtricity committed overdrive");
                stage.expect(stage.damageTo(near) > 0, "the riff hit the foe in the lane");
                stage.expect(stage.hits(near, true) >= 4, "three strums plus the late echo each landed a receipt on the held foe");
                stage.note("how far the foe is shoved and whether the 4-20% paralysis fired are random; the echo replays the third strum's own lane after the action wound down, without turning toward a new target", {
                    casts: stage.casts("overdrive", caster),
                    nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                    receipts: stage.hits(near, true),
                    nearParalyzed: stage.hadMobEffect(near, "world_combat:status/paralysis"),
                    casterTravelled: Math.round(stage.travelled(caster) * 10) / 10
                });
                stage.done();
            });
        }, "three strums plus the late echo all land on the held foe");
    });
});
