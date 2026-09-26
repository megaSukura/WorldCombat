/**
 * 迷昏拳 / dizzypunch 的可执行设计说明。
 *
 * 场面：只会迷昏拳的快拳手（Hitmonchan）贴着一只只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（连拳至少命中一拳）。
 * 打出几拳（速度决定）、混乱是否触发（约 20% 起）、眩量多久，写进 note 供读轨迹判断。
 */
Smoke.scenario("dizzypunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Hitmonchan", level: 38, moves: ["dizzypunch"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("dizzypunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("dizzypunch", caster) > 0, "dizzypunch was committed");
        stage.expect(stage.damageTo(foe) > 0, "the rhythmic punches dealt damage");
        stage.note("拳数由速度决定（约 2–5 拳），混乱约 20% 起、只落在真正被打到的人；被迷昏者出手会打偏，反噬不超过它打出的伤害", {
            casts: stage.casts("dizzypunch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            confused: stage.hadMobEffect(foe, "world_combat:status/confusion"),
            onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "dizzypunch lands on a foe at point-blank range");
});
