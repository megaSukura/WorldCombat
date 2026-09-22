/**
 * 破音 / overdrive —— 可执行设计说明。
 *
 * 一句话：扎住脚朝正前方连拨三下，每一下都沿同一条走廊推出带电的轰响，走廊里的敌人各挨一次重击、
 *   被打退，并可能被震到麻痹。
 *
 * 场面：白天晴天、石地。只带破音的颤弦蝾螈站在一侧，正前方两只小敌排成一列、都开战——它们都在同一条
 *   走廊上，用来核对「一次扫到一列」与「多段连打」。地面平坦，便于读走廊的位移。
 *
 * 断言只取必然事实：破音被放过、至少一个敌人挨到伤害。三下命中多少、被推多远、麻痹是否触发（每下概率）
 *   与暴击写进 note。
 */
Smoke.scenario("overdrive", function (stage) {
    stage.fill([-9, -1, -7], [11, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "toxtricity", level: 45, moves: ["overdrive"], at: [0, 0, 0] });
    var near = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [4.0, 0, 0] });
    var far = stage.pokemon({ species: "meowth", level: 18, moves: ["scratch"], at: [6.2, 0, 0.2] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1200, function () {
        return stage.casts("overdrive", caster) >= 1 && (stage.damageTo(near) > 0 || stage.damageTo(far) > 0);
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("overdrive", caster) >= 1, "toxtricity committed overdrive");
            stage.expect(stage.damageTo(near) > 0 || stage.damageTo(far) > 0, "the riff hit at least one foe in the lane");
            stage.note("how many of the strums land, how far each foe is knocked back and whether the 4-20% paralysis fired are random", {
                casts: stage.casts("overdrive", caster),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                farDamage: Math.round(stage.damageTo(far) * 10) / 10,
                nearParalyzed: stage.hadMobEffect(near, "world_combat:status/paralysis"),
                farParalyzed: stage.hadMobEffect(far, "world_combat:status/paralysis")
            });
            stage.done();
        });
    }, "overdrive riffs a foe within 60 s");
});
