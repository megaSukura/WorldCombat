/**
 * 撕裂爪 / crushclaw —— 可执行设计说明。
 *
 * 一句话：踏前一步，在身前走廊里交叉撕过，撕中可能把护甲撕开、防御下降；对已带破防身份的目标撕得更深。
 *
 * 场面：一只只会撕裂爪的猫鼬斩（45 级）对一只只会跃起的铁掌力士（60 级，只挨打不还手）。
 * 断言只取必然事实：这招被提交过、目标受到过伤害。撕甲是概率结果，是否撕开写进 note。
 */
Smoke.scenario("crushclaw", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 45, moves: ["crushclaw"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("crushclaw", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("crushclaw", caster) >= 1, "caster committed crush claw");
        stage.expect(stage.damageTo(foe) > 0, "crush claw dealt damage to the foe");
        stage.note("the tear is a 50% roll; the mark tag records whether it landed at all", {
            casts: stage.casts("crushclaw", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            rent: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "crush claw lands within 70 s");
});
