/**
 * 火之舞 / fierydance 的可执行设计说明。
 *
 * 一句话：两片相对的火翼从身周起转、绕身体扫过半圈展到外圈，扫到谁谁吃火焰；靠走位把翼缘贴到对手侧面。
 *
 * 场面：只会火之舞的火神蛾（Volcarona，火之舞唯一学习者，55 级）贴身一只不动（noai）的厚血卡比兽
 *   （Snorlax，40 级，只会跃起），相距约 1 格——在起始半径之内，第一刻向前的火翼必然扫到它。石地、白天、晴。
 *
 * 必然事实：本招被提交过（`stage.casts`）；火翼扫到目标并造成伤害（`stage.damageTo`）。
 *   两片翼各扫到谁、升特攻掷（约 50%）、以及同一目标是否被两片翼各扫一次写进 note 供读轨迹。
 */
Smoke.scenario("fierydance", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "volcarona", level: 55, moves: ["fierydance"], at: [-0.5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [0.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(1200, function () {
        return stage.casts("fierydance", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("fierydance", caster) >= 1, "the caster committed fiery dance");
            stage.expect(stage.damageTo(foe) > 0, "a fire wing swept the foe");
            stage.note("which wing caught the foe, the ~50% Sp. Atk roll, and whether both wings swept it are random/positional", {
                casts: stage.casts("fierydance", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fiery dance sweeps a foe at close range");
});
