/**
 * 圣剑 / sacredsword 的可执行设计说明。
 *
 * 场面：一只只会圣剑的艾路雷朵（Gallade，格斗系物攻学习者）面对约 3 格外的一只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子）。开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（这一刀切中）。
 * 目标是否涨过防、暴击与具体伤害，写进 note 供读轨迹判断。
 */
Smoke.scenario("sacredsword", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gallade", level: 35, moves: ["sacredsword"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..8] run data merge entity @s {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("sacredsword", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("sacredsword", caster) > 0, "sacredsword was committed");
            stage.expect(stage.damageTo(foe) > 0, "the long cut landed");
            stage.note("一记刃程最长的正前切斩：剑线只碰到的第一个非友方才吃这一刀，墙当面截住就停在墙面；本招无视目标涨起来的防御能力等级，但装备护甲仍参与减伤。铁傀儡没有涨防，居合式会把身位整个送出去，随机暴击留待人工试玩。", {
                casts: stage.casts("sacredsword", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "sacredsword cuts the foe at reach");
});
