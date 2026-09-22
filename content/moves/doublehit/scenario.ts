/**
 * 二连击 / doublehit —— 可执行设计说明。
 *
 * 一句话：一只会二连击的伙伴原地甩尾，向身前左右各扫一次，至少一扫落在对手身上。
 *
 * 场面：一只只会二连击的双尾怪手（ambipom，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 3 格——在射程内，AI 可以直接甩尾；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一扫的伤害（`stage.damageTo`）。
 *   两扫各自的命中与暴击、回扫还是直扫、目标被推开的位移，都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("doublehit", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ambipom", level: 30, moves: ["doublehit"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("doublehit", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("doublehit", caster) >= 1, "the caster committed doublehit");
            stage.expect(stage.damageTo(foe) > 0, "doublehit dealt damage to the foe");
            stage.note("each sweep rolls separately; arc vs straight changes the span and the shove direction; crit and displacement are variable", {
                casts: stage.casts("doublehit", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "doublehit sweeps a foe within 60 s");
});
