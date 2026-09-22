/**
 * 金属爪 / metalclaw 的可执行设计说明。
 *
 * 场面：只会金属爪的波士可多拉（Aggron，钢／岩，金属爪真实学习者，40 级）贴身一只僵尸（夜晚，僵尸不会被日光灼烧），
 *   两者开战。必然事实：本招被提交过（`stage.casts`）；爪劈命中并造成伤害（贴脸，命中几乎必然）。
 * 磨利几率（约 10%）与磨起几级是随机结果，写进 note 供读轨迹。
 */
Smoke.scenario("metalclaw", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "aggron", level: 40, moves: ["metalclaw"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("metalclaw", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("metalclaw", caster) >= 1, "the caster committed metal claw");
            stage.expect(stage.damageTo(foe) > 0, "the steel claws dealt damage to the foe");
            stage.note("the ~10% sharpen roll and how many attack levels it raised are random; the two-rake timing varies with speed", {
                casts: stage.casts("metalclaw", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "metal claw lands on a foe at point-blank range");
});
