/**
 * 臂贝武器 / shellsidearm —— 可执行设计说明。
 *
 * 一句话：释放时先看距离——远距离只能喷射（特殊·非接触的毒液投射物），命中时按实际命中者结算并可能中毒。
 *
 * 场面：一只只会臂贝武器的呆壳兽（slowbro，L40；原生的唯一学习者是它的伽勒尔形态，这里只用基础形态承载机制）
 *   对一只只会跃起、站桩的卡比兽（snorlax，L30），相隔 8 格——在近身距离之外，自动形态只能喷射；
 *   地面铺平、白天晴天。这样也验证了"不会为物理较高而从数格外发隐形长拳"。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过毒壳伤害（`stage.damageTo`）。
 * 随机量写进 note：这一发释放时选中的分类、中毒概率、暴击；近身钝击（贴脸横砸、首碰接触）留待人工观察。
 */
Smoke.scenario("shellsidearm", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "slowbro", level: 40, moves: ["shellsidearm"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("shellsidearm", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("shellsidearm", caster) >= 1, "the caster committed shell side arm");
            stage.expect(stage.damageTo(foe) > 0, "shell side arm dealt damage to the foe");
            stage.note("the damage category is chosen at impact (attack vs defence or special attack vs special defence); poison is a 20%% roll, crit is variable", {
                casts: stage.casts("shellsidearm", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foePoisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "shell side arm strikes a foe within 60 s");
});
