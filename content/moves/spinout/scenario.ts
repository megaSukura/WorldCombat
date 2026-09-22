/**
 * 疾速转轮 / spinout 的可执行设计说明。
 *
 * 场面：只会疾速转轮的普隆隆姆（Revavroom 56 级，速度快、物攻高）对一只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子），隔开一点距离。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、施法者为了撞上去移动过。
 * 命中/暴击、撞开距离、自身速度具体降级都写进 note 供读轨迹判断。
 */
Smoke.scenario("spinout", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "revavroom", level: 56, moves: ["spinout"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("spinout", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("spinout", caster) > 0, "spinout was committed");
            stage.expect(stage.damageTo(foe) > 0, "the spinning charge struck the foe");
            stage.expect(stage.travelled(caster) > 0.5, "the caster moved during the spinning charge");
            stage.note("spinout observations", {
                casts: stage.casts("spinout", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10
            });
            stage.done();
        });
    }, "spinout charges and lands within 50 s");
});
