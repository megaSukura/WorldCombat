/**
 * 暗影爪 / shadowclaw —— 可执行设计说明。
 *
 * 一句话：脚下的影子铺到对手身后，影爪从那一端反向抓回目标；对手没在看自己时这一爪更重。
 *
 * 场面：一只只会暗影爪的勾魂眼（40 级）对一只被点住、不会还手的铁傀儡。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击是否出现是随机的，写进 note；
 * 铁傀儡不会攻击施法者，因此理论上必然吃到「暗算」加成，也写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowclaw", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sableye", level: 40, moves: ["shadowclaw"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("shadowclaw", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("shadowclaw", caster) >= 1, "caster committed shadow claw");
        stage.expect(stage.damageTo(foe) > 0, "shadow claw dealt damage to the foe");
        stage.note("critical hits come from the native critRatio 2 roll; the NoAI golem never attacks back, so every claw lands while the target is not facing the caster (ambush bonus applies). The shadow band walks the real stone floor and the claw reverses from the band's end; the trace, not the selected target, decides the contact", {
            casts: stage.casts("shadowclaw", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "shadow claw lands within 30 s");
});
