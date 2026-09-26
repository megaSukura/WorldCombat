/**
 * 报复 / revenge —— 可执行设计说明。
 *
 * 一句话：站住、侧步让开正面，还一记短距横肘；最近被这次挨肘者本人打过时，这一肘翻倍并把对方顶开。
 *
 * 场面：一只只带这一招的格斗手对一只会还手、血厚的对手；平地、夜晚，避免日光与地形干扰读数。
 * 对手先打到施法者之后，接下来的横肘就在记仇窗口里翻倍，轨迹能读出那一段；施法者不再整段追冲。
 * 断言只取必然事实：这招被提交过、对手吃到过伤害。
 * 具体哪一记翻倍取决于谁先动手，写进 note 供读轨迹判断。
 */
Smoke.scenario("revenge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var user = stage.pokemon({ species: "machamp", level: 46, moves: ["revenge"], at: [-1.8, 0, 0], properties: "nature=adamant" });
    var foe = stage.mob({ type: "minecraft:ravager", at: [2.2, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1600, function () {
        return stage.casts("revenge", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("revenge", user) > 0, "machamp committed revenge");
            stage.expect(stage.damageTo(foe) > 0, "the retort elbow dealt damage");
            stage.note("doubling needs the caster to have been hurt by this very victim inside the window; a third body or a wall stops the elbow at the real contact, read the trace for whether the foe struck first", {
                casts: stage.casts("revenge", user),
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                taken: Math.round(stage.damageTo(user) * 10) / 10,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "revenge lands on the target within 30 s");
});
