/**
 * 攀瀑 / waterfall 的可执行设计说明。
 *
 * 场面：只会攀瀑的浮潜鼬（Floatzel）对三格外的卡比兽（Snorlax，只带跃起、不会还手），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（水帘拍实）。
 * 是否畏缩（约 20% 起）、被冲退多远、雨势加成与暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("waterfall", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Floatzel", level: 38, moves: ["waterfall"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("waterfall", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("waterfall", caster) > 0, "waterfall was committed");
        stage.expect(stage.damageTo(foe) > 0, "the pouncing water curtain dealt damage");
        stage.note("畏缩概率约 20% 起、受物攻与雨势影响；冲退距离与是否扑空见实现", {
            casts: stage.casts("waterfall", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            movedFoe: Math.round(stage.travelled(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "waterfall lands on a foe at close range");
});
