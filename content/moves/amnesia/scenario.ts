/**
 * 瞬间失忆 的可执行设计说明。
 *
 * 场面：一只只会「瞬间失忆」的呆呆兽（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先放空。默认的「彻底失忆」起手更长，但也会把缠着心智的状态一次忘光。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/amnesia 的空明窗口。
 *   特防抬了几级、空明撑多久、忘掉了几个状态写进 note 供读轨迹判断（私有装配读不到原生能力等级，
 *   也没有生产方在同一装配里，因此忘却一条只能记录为 0 并说明接线）。
 */
Smoke.scenario("amnesia", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "slowpoke", level: 24, moves: ["amnesia"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("amnesia", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/amnesia");
    }, function () {
        stage.expect(stage.casts("amnesia", caster) > 0, "amnesia was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/amnesia"), "the blank window carried the shared identity");
        stage.after(80, function () {
            stage.note("Sp. Def stages are native for a Pokemon and unreadable here; the window takes them back by its stored amplifier when it ends. Forgetting is wired to shared identities (confusion/attract/taunt/torment/encore/disable) produced by other units, so it reads 0 in this private assembly.", {
                casts: stage.casts("amnesia", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "amnesia engages");
});
