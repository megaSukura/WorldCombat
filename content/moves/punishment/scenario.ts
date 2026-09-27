/**
 * 惩罚 / punishment 的可执行设计说明。
 *
 * 场面：一只只会惩罚的驹刀小兵（Pawniard，恶系物攻学习者）面对约 3 格外的一只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子），并预先给它一层共享能力等级与一段正面药水，验证「读真碰者的强化且保留」。
 * 开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（这一记砸中）；命中后目标仍带着那层正面药水。
 * 暴击、具体伤害与被墙／其他身体挡住的下压面留待人工试玩，写进 note 供读轨迹判断。
 */
Smoke.scenario("punishment", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Pawniard", level: 25, moves: ["punishment"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..8] run data merge entity @s {NoAI:1b}");
    stage.boost(foe, { atk: 2 });
    stage.command("effect give @e[type=minecraft:iron_golem,distance=..8] minecraft:strength 9999 1 true");
    stage.until(700, function () {
        return stage.casts("punishment", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("punishment", caster) > 0, "punishment was committed");
            stage.expect(stage.damageTo(foe) > 0, "the judgement dealt damage");
            stage.expect(stage.hasMobEffect(foe, "minecraft:strength"), "the beneficial buff stayed on the target");
            stage.note("这一记的威力在命中那一刻随目标正向能力等级与正面状态层数上升（总数封顶 10 级），命中后目标保留这些增益；本场景给铁傀儡预置 atk +2 与一段力量药水，读到的是带强化的档。抬臂期间目标移出下身下压扫线、或被墙／其他身体挡住会落空。随机暴击留待人工试玩。", {
                casts: stage.casts("punishment", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                stages: stage.stages(foe),
                buff: stage.hasMobEffect(foe, "minecraft:strength"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "punishment falls on the foe");
});
