/**
 * 打草结的可执行设计说明。
 *
 * 场面：一只只会打草结的草系精灵（Snivy），面对 3 格外一只笨重缓慢的 Snorlax。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被缠中并受到伤害（缠结收拢时同一次判定）；目标身上出现过 tripped 身份。
 * 是否在延迟内走出范围、有没有触发草皮留存的具体方块变化，都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("grassknot", function (stage) {
    var caster = stage.pokemon({ species: "Snivy", level: 36, moves: ["grassknot"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 18, moves: ["tackle"], at: [3, 0, 0] });
    stage.block([3, -1, 0], "minecraft:dirt");
    stage.block([2, -1, 0], "minecraft:dirt");
    stage.block([4, -1, 0], "minecraft:dirt");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("grassknot") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("grassknot") > 0, "grassknot was committed");
            stage.expect(stage.damageTo(foe) > 0, "the snare dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/tripped"), "the target was tripped");
            stage.expect(stage.changedBlocks().some(function (b) { return b.after === "minecraft:moss_block"; }),
                "the turf was laid in the world");
            stage.note("grassknot observations", { casts: stage.casts("grassknot"), onFoe: stage.damageTo(foe),
                tripped: stage.hadMobEffect(foe, "world_combat:status/tripped"),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster),
                changed: stage.changedBlocks() });
            stage.done();
        });
    }, "grassknot lands");
});
