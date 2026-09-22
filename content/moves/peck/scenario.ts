/**
 * 啄 / peck 的可执行设计说明。
 *
 * 场面：一只只会啄的烈雀（Spearow，喙快而短）面对约 3 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一啄。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（啄实）。
 * 是否命中空中目标、俯冲式的具体突进距离、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("peck", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Spearow", level: 25, moves: ["peck"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("peck", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("peck", caster) > 0, "peck was committed");
            stage.expect(stage.damageTo(foe) > 0, "the peck dealt damage");
            stage.note("贴身单发点啄；目标离地时伤害更高并被压回地面", {
                casts: stage.casts("peck", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "peck jabs the foe at close range");
});
