/**
 * 惩罚 / punishment 的可执行设计说明。
 *
 * 场面：一只只会惩罚的驹刀小兵（Pawniard，恶系物攻学习者）面对约 3 格外的一只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子）。开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（这一记砸中）。
 * 目标的涨能力对威力的影响、暴击与具体伤害，写进 note 供读轨迹判断（本场景的铁傀儡不会自己叠能力等级）。
 */
Smoke.scenario("punishment", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Pawniard", level: 25, moves: ["punishment"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..8] run data merge entity @s {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("punishment", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("punishment", caster) > 0, "punishment was committed");
            stage.expect(stage.damageTo(foe) > 0, "the judgement dealt damage");
            stage.note("这一记的威力随目标正向能力等级上升；铁傀儡不会自己叠等级，所以本场景读到的是基础档。要核对读能力那一项，请让目标先涨能力等级（吃一次剑舞之类）再罚。随机暴击留待人工试玩。", {
                casts: stage.casts("punishment", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "punishment falls on the foe");
});
