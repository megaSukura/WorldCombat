/**
 * 巨声 / hypervoice —— 可执行设计说明。
 *
 * 一句话：扎住脚把一声咆哮沿正前方的扇形整片压出去，扇面内的敌人被同一堵声墙轰中并被推回去。
 *
 * 场面：白天晴天、石地。只带巨声的爆音怪站在中间，前方两只小敌挨得较近、都开战——它们会一起冲上来，
 *   正好落进同一片前扇形，用来核对「一次扫到多人」与「几乎不分远近」。地面平坦，用来读「不看掩体」的位移。
 *
 * 断言只取必然事实：巨声被放过、至少一个敌人挨到伤害。被推开的距离、边缘衰减与暴击写进 note。
 */
Smoke.scenario("hypervoice", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exploud", level: 45, moves: ["hypervoice"], at: [0, 0, 0] });
    var near = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [3.4, 0, 0] });
    var side = stage.pokemon({ species: "meowth", level: 18, moves: ["scratch"], at: [4.2, 0, 1.0] });
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(1200, function () {
        return stage.casts("hypervoice", caster) >= 1 && (stage.damageTo(near) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("hypervoice", caster) >= 1, "exploud committed hyper voice");
            stage.expect(stage.damageTo(near) > 0 || stage.damageTo(side) > 0, "the wall of sound hit at least one foe");
            stage.note("how many foes fall inside the fan, how far each is shoved and the distance falloff are positional/random", {
                casts: stage.casts("hypervoice", caster),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
                nearTravelled: Math.round(stage.travelled(near) * 10) / 10,
                sideTravelled: Math.round(stage.travelled(side) * 10) / 10
            });
            stage.done();
        });
    }, "hyper voice sweeps a foe within 60 s");
});
