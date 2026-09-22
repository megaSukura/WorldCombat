/**
 * 龙爪 / dragonclaw 的可执行设计说明。
 *
 * 场面：一只只会龙爪的圆陆鲨（Gible）面对左右两只各距约 2 格的僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一扫。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；至少一只目标受到过伤害（扇面内有敌人）。
 * 一次扫到几个、是否撕开护甲、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonclaw", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gible", level: 30, moves: ["dragonclaw"], at: [0, 0, 0] });
    var left = stage.mob({ type: "minecraft:zombie", at: [2, 0, -1] });
    var right = stage.mob({ type: "minecraft:zombie", at: [2, 0, 1] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.until(1000, function () {
        return stage.casts("dragonclaw", caster) > 0 && (stage.damageTo(left) > 0 || stage.damageTo(right) > 0);
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("dragonclaw", caster) > 0, "dragonclaw was committed");
            stage.expect(stage.damageTo(left) + stage.damageTo(right) > 0, "the fan caught at least one foe");
            stage.note("宽扇形扫击；被扫中的目标防御下降，画面里两道交叉爪痕同时划过", {
                casts: stage.casts("dragonclaw", caster),
                left: Math.round(stage.damageTo(left) * 10) / 10,
                right: Math.round(stage.damageTo(right) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "dragonclaw sweeps the fan and catches a foe");
});
