/**
 * 龙爪 / dragonclaw 的可执行设计说明。
 *
 * 场面：一只只会龙爪的圆陆鲨（Gible）面对正前方一只被点住（native NoAI）、不会还手的铁傀儡（大身体靶子，用来
 * 验证两爪带的实体箱判定能碰到大身体边缘），以及左右两只各距约 2 格的僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一扫。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；至少一只目标受到过伤害。两条爪带各扫到几个、中心目标是否被撕甲、暴击，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonclaw", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gible", level: 30, moves: ["dragonclaw"], at: [0, 0, 0] });
    var big = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var left = stage.mob({ type: "minecraft:zombie", at: [2, 0, -2] });
    var right = stage.mob({ type: "minecraft:zombie", at: [2, 0, 2] });
    stage.hostile(caster, big);
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.noai(big);
    stage.until(1000, function () {
        return stage.casts("dragonclaw", caster) > 0 && (stage.damageTo(big) > 0 || stage.damageTo(left) > 0 || stage.damageTo(right) > 0);
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("dragonclaw", caster) > 0, "dragonclaw was committed");
            stage.expect(stage.damageTo(big) + stage.damageTo(left) + stage.damageTo(right) > 0, "a crossing claw band caught at least one foe");
            stage.note("两条交叉爪带同刻判定，用真实实体箱与两带体积相交（大身体边缘也算数）；被任一爪带扫到的目标各结算一次伤害，中心双带共同覆盖且撕甲真正落地的目标才补双交叉反馈", {
                casts: stage.casts("dragonclaw", caster),
                big: Math.round(stage.damageTo(big) * 10) / 10,
                left: Math.round(stage.damageTo(left) * 10) / 10,
                right: Math.round(stage.damageTo(right) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "dragonclaw sweeps two crossing bands and catches a foe");
});
