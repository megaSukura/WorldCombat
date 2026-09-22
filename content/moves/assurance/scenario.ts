/**
 * 恶意追击 / assurance —— 可执行设计说明。
 *
 * 一句话：追上去补一记；目标在追击窗口内已经受过伤时，这一记翻倍。
 *
 * 场面：一只只带这一招的物攻手对一只血厚的对手；平地、夜晚，避免日光与地形干扰读数。
 * 血厚让第一记把对手打伤、第二记正好落在追击窗口里，轨迹能读出翻倍的那一段。
 * 断言只取必然事实：这招被提交过、对手吃到过伤害。
 * 具体哪几记翻倍取决于出手节奏，写进 note 供读轨迹判断。
 */
Smoke.scenario("assurance", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var user = stage.pokemon({ species: "scrafty", level: 45, moves: ["assurance"], at: [-2, 0, 0], properties: "nature=adamant" });
    var foe = stage.mob({ type: "minecraft:ravager", at: [2.5, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1600, function () {
        return stage.casts("assurance", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("assurance", user) > 0, "scrafty committed assurance");
            stage.expect(stage.damageTo(foe) > 0, "the pursuit strike dealt damage");
            stage.note("the first hit wounds the target, so later casts land inside the pursuit window and double; read the trace for which casts were doubled", {
                casts: stage.casts("assurance", user),
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                taken: Math.round(stage.damageTo(user) * 10) / 10,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "assurance lands on the target within 30 s");
});
