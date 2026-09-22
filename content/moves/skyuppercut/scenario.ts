/**
 * 冲天拳 / skyuppercut 的可执行设计说明。
 *
 * 场面：只会冲天拳的火焰鸡（Blaziken，格斗上勾）对着被点住、不会走开的铁傀儡（体型高大、耐打），晴天平地，
 * 初始距离约 1 格（拳程内）。默认配置为冲天式。铁傀儡 `NoAI` 定住，保证上勾把目标稳定顶离地面。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（上勾命中）。
 * 被顶起多高（体重与配置决定的 `lift`）、是否吃到离地加成，写进 note 供读轨迹判断。
 */
Smoke.scenario("skyuppercut", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Blaziken", level: 34, moves: ["skyuppercut"], at: [-0.6, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0.6, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("skyuppercut", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("skyuppercut", caster) > 0, "sky uppercut was committed");
            stage.expect(stage.damageTo(foe) > 0, "the uppercut dealt damage");
            stage.note("上勾把目标顶离地面（垂直位移）；离地目标吃 airBonus，竖直覆盖由身高决定", {
                casts: stage.casts("skyuppercut", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "sky uppercut lifts a point-blank foe off the ground");
});
