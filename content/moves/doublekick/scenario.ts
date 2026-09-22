/**
 * 二连踢 / doublekick —— 可执行设计说明。
 *
 * 一句话：一只会二连踢的尼多兰（L30，原生学习者）贴身对一只站桩的卡比兽连踢两脚，至少一脚落在它身上。
 *
 * 场面：尼多兰（nidoranf）只会二连踢，卡比兽（snorlax）只会跃起、原地站桩，相隔 2 格——在射程内，
 *   AI 可以直接起脚；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一脚的伤害（`stage.damageTo`）。
 *   两脚各自的命中、暴击、挑起与踹飞位移、交替/连踢形态都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("doublekick", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "nidoranf", level: 30, moves: ["doublekick"], at: [-1, 0, 0], properties: "nature=adamant" });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("doublekick", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("doublekick", caster) >= 1, "the caster committed doublekick");
            stage.expect(stage.damageTo(foe) > 0, "doublekick dealt damage to the foe");
            stage.note("each kick rolls separately; alternate lifts then launches, straight kicks stay low; crit and displacement are variable", {
                casts: stage.casts("doublekick", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "doublekick lands on a foe within 60 s");
});
