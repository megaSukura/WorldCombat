/**
 * 冤冤相报 / bittermalice —— 可执行设计说明。
 *
 * 一句话：把心头的怨念放出去，化作一只手循着目标飞过去攥住它，造成特殊伤害并压低攻击；自身越伤怨念越重。
 *
 * 场面：石头地面、晴夜。一只只会「冤冤相报」的耿鬼（技能表只给这一招，AI 就只会用它）对上一只铁傀儡——
 *   铁傀儡血厚，能撑过这记隔空的怨念，好让掉攻落到它的攻击属性上被读到。
 * 必然事实：冤冤相报被提交过；铁傀儡受到过伤害；铁傀儡的攻击属性在命中后下降。
 *   目标异常翻倍 / 怨念式吞掉异常、以及实际伤害与暴击写进 note（本场目标不带异常，翻倍窗口不成立）。
 */
Smoke.scenario("bittermalice", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var wraith = stage.pokemon({ species: "gengar", level: 34, moves: ["bittermalice"], at: [-5, 0, 0], properties: "nature=modest" });
    var golem = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    var baseAttack = stage.attribute(golem, "minecraft:generic.attack_damage");
    stage.hostile(wraith, golem);
    stage.until(1500, function () {
        return stage.casts("bittermalice", wraith) >= 1 && stage.damageTo(golem) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("bittermalice", wraith) >= 1, "gengar committed bitter malice");
            stage.expect(stage.damageTo(golem) > 0, "the grudge hand dealt damage to the target");
            stage.expect(stage.attribute(golem, "minecraft:generic.attack_damage") < baseAttack,
                "the grudge lowered the target's attack attribute through the shared stat ladder");
            stage.note("bitter malice is a ranged special grudge that follows the target; lingering mode (default) doubles against a target carrying any major status, and grudge mode instead devours that status for a deeper Attack drop. This stage's target carries no status, so only the plain path runs. Random parts: damage roll and crit.", {
                casts: stage.casts("bittermalice", wraith),
                baseAttack: Math.round(baseAttack * 100) / 100,
                attackNow: Math.round(stage.attribute(golem, "minecraft:generic.attack_damage") * 100) / 100,
                dealt: Math.round(stage.damageBy(wraith) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(golem) * 10) / 10,
                targetAlive: golem.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "bitter malice lands on the target within 75 s");
});
