/**
 * 空手劈 / karatechop —— 可执行设计说明。
 *
 * 一句话：抬手一记手刀，零起手、贴身单点，一道竖直白线瞬间落下；暴击率高一档，冷却极短。
 *
 * 场面：一只只会空手劈的腕力（40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击是否出现是随机的；刀路从抬手处压到真实接触点，
 *   属几何表现，写进 note 供读轨迹。
 */
Smoke.scenario("karatechop", function (stage) {
    stage.fill([-6, -1, -5], [6, -1, 5], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 40, moves: ["karatechop"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("karatechop", caster) >= 3 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("karatechop", caster) >= 1, "caster committed karatechop");
        stage.expect(stage.damageTo(foe) > 0, "karatechop dealt damage to the foe");
        stage.note("the blade runs from the raised arm to the real contact and stops at the first body or wall; criticals come from the native critRatio 2 roll, and the chop lowers the foe's defence reduction through its damage parameter rather than any armour-break state", {
            casts: stage.casts("karatechop", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "karatechop lands within 30 s");
});
