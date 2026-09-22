/**
 * 愤怒之拳 / ragefist —— 可执行设计说明。
 *
 * 一句话：把挨过的每一记都记成拳印，出手时一并打回去；攒了几记就多甩几记鬼拳。
 *
 * 场面：一只只会愤怒之拳的彷徨夜灵（35 级）对一只只会「撞击」的怪力：怪力会还手，正是要它打的——
 *   挨打就是攒拳印，攒起来的拳印又变成出拳数。两边都是宝可梦、都会按同一套共享 AI 交手。
 * 必然事实：本招被提交过；对手挨到过拳；施法者身上出现过共享身份 world_combat:status/rage_fist 的拳印。
 * 攒了几记、甩了几拳、暴击与否写进 note 供读轨迹判断。
 */
Smoke.scenario("ragefist", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dusknoir", level: 35, moves: ["ragefist"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "machamp", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ragefist", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(caster, "world_combat:status/rage_fist");
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("ragefist", caster) > 0, "dusknoir committed rage fist");
            stage.expect(stage.damageTo(foe) > 0, "the ghostly flurry dealt damage");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/rage_fist"), "taking a hit banked a fist mark on the caster");
            stage.note("fists = 1 + stored, so marks banked from being hit turn into extra punches; the foe fights back and the marks stay until the fight lapses", {
                casts: stage.casts("ragefist", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                taken: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "rage fist flurries and banks marks within 70 s");
});
