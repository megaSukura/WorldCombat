/**
 * 大字爆炎 / fireblast 的可执行设计说明。
 *
 * 场面：只会大字爆炎的喷火龙（Charizard）对六格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（字崩开罩到它）。
 * 85 命中落成「写偏距离」，单次可能擦边；引燃是 10% 起的概率、暴击见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("fireblast", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charizard", level: 50, moves: ["fireblast"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("fireblast", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("fireblast", caster) > 0, "fire blast was committed");
        stage.expect(stage.damageTo(foe) > 0, "the glyph burst and scorched the foe");
        stage.note("字心写偏（85 命中）、引燃约 10% 起（fireblast.burnChance）、暴击随机；刻印式的字痕若开出会额外掉血", {
            casts: stage.casts("fireblast", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "fire blast lands within 80 s");
});
