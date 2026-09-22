/**
 * 回旋踢的可执行设计说明：让会这一招的腕力（Machop，真实学习者）对一只关掉 AI 的铁傀儡起旋扑踢。
 * 铁傀儡不逃不还手，所以 `travelled` 只可能来自这一记的抛飞。
 *
 * 必然事实：本招被提交过（`stage.casts`）；回旋腿踢中目标并造成伤害（`damageTo`）；目标被踢飞、离开原位（`travelled`）。
 * 30% 畏缩、以及抛飞的落点都写进 note 供读轨迹判断。
 */
Smoke.scenario("rollingkick", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 30, moves: ["rollingkick"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("rollingkick", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("rollingkick", caster) >= 1, "the caster committed rolling kick");
            stage.expect(stage.damageTo(foe) > 0, "the spinning kick struck and damaged the foe");
            stage.expect(stage.travelled(foe) > 0, "the launch sent the foe off its spot");
            stage.note("whether the 30% flinch rolled and where the foe landed are random", {
                casts: stage.casts("rollingkick", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch")
            });
            stage.done();
        });
    }, "rolling kick lands within 70 s");
});
