/**
 * 百万吨重拳 / megapunch 的可执行设计说明。
 *
 * 场面：只会百万吨重拳的重拳手（Machamp）贴着只会跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（三维拳路命中）。
 * 被推开多远（体重与目标体型决定）、是否落在拳路里，写进 note 供读轨迹判断。
 */
Smoke.scenario("megapunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Machamp", level: 38, moves: ["megapunch"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("megapunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("megapunch", caster) > 0, "megapunch was committed");
            stage.expect(stage.damageTo(foe) > 0, "the straight punch dealt damage");
            stage.note("三维拳路命中；目标按双方实际体型被沿拳路推开（施法者体重与目标体型决定距离），侧身或走出拳路可让开", {
                casts: stage.casts("megapunch", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "megapunch lands down the lane on a foe at point-blank range");
});
