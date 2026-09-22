/**
 * 臂锤 / hammerarm 的可执行设计说明。
 *
 * 场面：只会臂锤的隆隆岩（Golem 40 级，重、物攻高）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   相隔 2 格。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、拳面在草地砸出粗土裂痕。
 * 命中/暴击、砸退距离、自身速度具体降几级都写进 note 供读轨迹判断。
 */
Smoke.scenario("hammerarm", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["hammerarm"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("hammerarm", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("hammerarm", caster) > 0, "hammerarm was committed");
            stage.expect(stage.damageTo(foe) > 0, "the overhead hammer blew landed on the foe");
            stage.expect(changed.some(function (b) { return b.after === "minecraft:coarse_dirt" || b.after === "minecraft:cracked_stone_bricks"; }),
                "the fist left a cleft in the ground");
            stage.note("hammerarm observations", {
                casts: stage.casts("hammerarm", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(foe) * 10) / 10,
                changed: changed
            });
            stage.done();
        });
    }, "hammerarm blows and its cleft lands within 50 s");
});
