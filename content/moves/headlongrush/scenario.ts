/**
 * 突飞猛扑 / headlongrush 的可执行设计说明。
 *
 * 场面：只会突飞猛扑的 Ursaluna 40 级，对一只被点住、不会还手的铁傀儡，相隔 5 格（留出助跑距离）。
 *   AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、地面被犁出粗土或裂石。
 * 冲了多远、撞开多少、自身降级（原生能力阶梯，私有装配里没有读取原语），都写进 note 供读轨迹判断。
 */
Smoke.scenario("headlongrush", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ursaluna", level: 40, moves: ["headlongrush"], at: [-2.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("headlongrush", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("headlongrush", caster) > 0, "headlongrush was committed");
            stage.expect(stage.damageTo(foe) > 0, "the charge dealt damage to the foe");
            stage.expect(changed.some(function (b) { return b.after === "minecraft:coarse_dirt" || b.after === "minecraft:cracked_stone_bricks"; }),
                "the charge plowed a furrow in the ground");
            stage.note("headlongrush observations", {
                casts: stage.casts("headlongrush", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                changed: changed
            });
            stage.done();
        });
    }, "headlongrush commits and its charge lands within 45 s");
});
