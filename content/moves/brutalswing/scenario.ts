/**
 * 狂舞挥打 / brutalswing 的可执行设计说明。
 *
 * 场面：只会狂舞挥打的暴鲤龙（Gyarados 36 级，体型大、物攻高）对两只被点住、不会还手的铁傀儡
 *   （耐打又不会跑掉的靶子），两只并排站在它身侧。AI 只有这一招可用。
 * 必然事实：本招被提交过；两只铁傀儡都被这一圈扫到、都受过伤害。
 * 命中率、被扫飞的偏移距离与具体伤害都写进 note 供读轨迹判断。
 */
Smoke.scenario("brutalswing", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gyarados", level: 36, moves: ["brutalswing"], at: [-3, 0, -1] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 2] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=2] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("brutalswing", caster) > 0 && stage.damageTo(left) > 0 && stage.damageTo(right) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("brutalswing", caster) > 0, "brutalswing was committed");
            stage.expect(stage.damageTo(left) > 0, "the first adjacent foe was swept");
            stage.expect(stage.damageTo(right) > 0, "the second adjacent foe was swept in the same circle");
            stage.note("brutalswing observations", {
                casts: stage.casts("brutalswing", caster),
                left: Math.round(stage.damageTo(left) * 10) / 10,
                right: Math.round(stage.damageTo(right) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "brutalswing sweeps both adjacent foes within 50 s");
});
