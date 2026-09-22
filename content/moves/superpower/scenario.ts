/**
 * 蛮力 / superpower 的可执行设计说明。
 *
 * 场面：只会蛮力的有力精灵（Machamp 36 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   相隔 2 格。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、冲击在地面留下坑（方块变成裂石或粗土）。
 * 命中/撞飞距离、自身攻防下降的具体级数、震荡式是否扫到第二名目标，都写进 note 供读轨迹判断。
 */
Smoke.scenario("superpower", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machamp", level: 36, moves: ["superpower"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("superpower", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("superpower", caster) > 0, "superpower was committed");
            stage.expect(stage.damageTo(foe) > 0, "the lunge dealt damage to the foe");
            stage.expect(changed.some(function (b) { return b.after === "minecraft:cracked_stone_bricks" || b.after === "minecraft:coarse_dirt"; }),
                "the impact left a crater in the ground");
            stage.note("superpower observations", {
                casts: stage.casts("superpower", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                ownHurt: Math.round(stage.damageTo(caster) * 10) / 10,
                changed: changed
            });
            stage.done();
        });
    }, "superpower commits and its lunge lands within 45 s");
});
