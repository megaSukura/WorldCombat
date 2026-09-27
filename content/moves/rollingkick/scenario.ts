/**
 * 回旋踢的可执行设计说明：让会这一招的腕力（Machop，真实学习者）对一只关掉 AI 的铁傀儡起旋扑踢。
 * 铁傀儡抗击退拉满（原生默认 1.0），新过程的踢飞走原生受击冲量 `hitImpulse`：抗推的目标只吃这一脚的伤害，
 * 不该被硬搬离原位——旧过程用 `displace` 强行位移，会无视抗击退把它搬走。
 *
 * 必然事实：本招被提交过（`stage.casts`）；回旋腿踢中目标并造成伤害（`damageTo`）；抗击退的铁傀儡没有被强挪（`travelled`）。
 * 30% 畏缩、以及低抗击退目标沿真实抛体弧线飞出的落点，写进 note 供读轨迹判断。
 */
Smoke.scenario("rollingkick", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 30, moves: ["rollingkick"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("rollingkick", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("rollingkick", caster) >= 1, "the caster committed rolling kick");
            stage.expect(stage.damageTo(foe) > 0, "the spinning kick struck and damaged the foe");
            stage.expect(stage.travelled(foe) < 0.6, "the knockback-resistant target was not hard-displaced");
            stage.note("the kick applies a real hitImpulse, so a fully knockback-resistant body only takes the damage and stays put; a low-resistance target would follow the native ballistic arc. Whether the 30% flinch rolled is random", {
                casts: stage.casts("rollingkick", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                resistance: stage.attribute(foe, "minecraft:generic.knockback_resistance"),
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch")
            });
            stage.done();
        });
    }, "rolling kick lands within 70 s");
});
