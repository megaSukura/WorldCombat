/**
 * 十万马力 / highhorsepower —— 可执行设计说明。
 *
 * 一句话：压低整个身体、用质量贴地正面冲撞一个目标；撞中时体重与速度换算出的「马力」数浮在撞击点上方。
 *
 * 场面：只会十万马力的象牙猪（Mamoswine，冰/地面、体重大）对一只被点住、不会还手的铁傀儡，脚下铺石头。
 * 断言只取必然事实：这招被提交过、目标受过伤害、施法者确实位移过（这是一记冲撞）。
 * 马力数是否够大、顶开距离、压身式分支、扬尘量随体重的差异都写进 note，供读轨迹与试玩核对。
 */
Smoke.scenario("highhorsepower", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mamoswine", level: 45, moves: ["highhorsepower"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit:1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("highhorsepower", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("highhorsepower", caster) >= 1, "caster committed high horsepower");
        stage.expect(stage.damageTo(foe) > 0, "the body slam dealt damage");
        stage.expect(stage.travelled(caster) > 1, "the charge carried the caster forward");
        stage.note("the horsepower readout and dust count come from weight/speed/attack; shove and the press form are preference/positional and the golem is a NoAI stone target, so they are read from the trace only", {
            casts: stage.casts("highhorsepower", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "high horsepower lands within 30 s");
});
