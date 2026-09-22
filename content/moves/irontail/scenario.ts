/**
 * 铁尾 / irontail —— 可执行设计说明。
 *
 * 一句话：抬尾预告一条线，再沿那条线把钢尾重砸到落点，圈内目标挨重击、被顶开，可能被砸凹防御。
 *
 * 场面：一只只会铁尾的波士可多拉（45 级）对一只只会跃起的铁掌力士（60 级，只挨打不还手）。
 * 断言只取必然事实：这招被提交过、目标受到过伤害。砸凹是概率结果，等两次施放让掷骰在轨迹里出现，是否砸凹写进 note。
 */
Smoke.scenario("irontail", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "aggron", level: 45, moves: ["irontail"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("irontail", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("irontail", caster) >= 1, "caster committed iron tail");
        stage.expect(stage.damageTo(foe) > 0, "iron tail dealt damage to the foe");
        stage.note("the dent is a 30% roll; the mark tag records whether it landed at all", {
            casts: stage.casts("irontail", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            dented: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "iron tail lands within 70 s");
});
