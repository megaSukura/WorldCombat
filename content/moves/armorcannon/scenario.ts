/**
 * 铠农炮 / armorcannon 的可执行设计说明。
 *
 * 场面：只会铠农炮的 Armarouge 36 级，对一只被点住、不会还手的铁傀儡，相隔 8 格（在射程内、留出飞行距离）。
 *   AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、落点烧出焦地（方块变成黑石）。
 * 弹速、命中位置、自身降级（原生能力阶梯，私有装配里没有读取原语），都写进 note 供读轨迹判断。
 */
Smoke.scenario("armorcannon", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "armarouge", level: 36, moves: ["armorcannon"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("armorcannon", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("armorcannon", caster) > 0, "armorcannon was committed");
            stage.expect(stage.damageTo(foe) > 0, "the shell dealt damage to the foe");
            stage.expect(changed.some(function (b) { return b.after === "minecraft:blackstone" || b.after === "minecraft:polished_blackstone"; }),
                "the shell scorched the ground at the impact");
            stage.note("armorcannon observations", {
                casts: stage.casts("armorcannon", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                changed: changed
            });
            stage.done();
        });
    }, "armorcannon commits and its shell lands within 45 s");
});
