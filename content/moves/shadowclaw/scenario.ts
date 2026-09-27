/**
 * 暗影爪 / shadowclaw —— 可执行设计说明。
 *
 * 一句话：脚下的影子逐刻铺到对手身后，影爪从那一端反向抓回目标；对手正在打别人、没在看自己时这一爪更重。
 *
 * 场面：一只只会暗影爪的勾魂眼（40 级）对一只被点住、不会还手的铁傀儡。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击是否出现是随机的，写进 note；
 * 铁傀儡 NoAI 不会攻击任何人，`attacking` 为空，因此**不算**偷袭：这一爪只有基本伤害、没有暗算加成，
 * 写进 note 供读轨迹判断（要触发暗算需要另设一个正在攻击友方的目标）。
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
        stage.note("critical hits come from the native critRatio 2 roll. The NoAI golem never attacks anyone, so its attacking target is empty and the claw gets no ambush bonus; ambush needs a target that is currently attacking somebody else. The shadow head walks the real stone floor step by step (SurfacePaths) and the claw reverses from the actual band end; the trace, not the selected target, decides the contact", {
            casts: stage.casts("shadowclaw", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "shadow claw lands within 30 s");
});
