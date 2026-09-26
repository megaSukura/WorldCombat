/**
 * 高温重压的可执行设计说明。
 *
 * 场面：一只只会高温重压的重型精灵（Snorlax），面对 3 格外一只极慢、极轻的 Shuckle（脚下有土）。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被贴地压中并受到伤害。
 * 是否掷中点燃、火痕留了哪些粒子，都是概率与画面结果，写进 note 供读轨迹判断。
 * 本招不再替换地表，所以不检查 changedBlocks。
 */
Smoke.scenario("heatcrash", function (stage) {
    var caster = stage.pokemon({ species: "Snorlax", level: 36, moves: ["heatcrash"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Shuckle", level: 15, moves: ["tackle"], at: [3, 0, 0] });
    stage.block([3, -1, 0], "minecraft:dirt");
    stage.block([2, -1, 0], "minecraft:dirt");
    stage.block([4, -1, 0], "minecraft:dirt");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("heatcrash") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("heatcrash") > 0, "heatcrash was committed");
            stage.expect(stage.damageTo(foe) > 0, "the crash dealt damage");
            stage.note("heatcrash observations", { casts: stage.casts("heatcrash"), onFoe: stage.damageTo(foe),
                burning: stage.hadMobEffect(foe, "world_combat:status/burn"),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster),
                changed: stage.changedBlocks() });
            stage.done();
        });
    }, "heatcrash lands");
});
