/**
 * 疯狂伏特 / wildcharge 的可执行设计说明。
 *
 * 场面：会疯狂伏特的斑斑马（Zebstrika）对一只只会跃起、不会还手、血够厚的卡比兽（Snorlax），在雨中开战。
 * 雨让双方都湿透，正好读出本招的湿身回路：施法者起冲就在脚下漏电（反噬更重），靶子湿透则会被必然传导一次麻痹。
 * 必然事实：本招被提交过；命中过靶子、施法者因此掉过血（反作用力）；目标带上过共享的麻痹身份。
 * 传导只在命中且目标湿身时发生，湿身由雨保证；命中 100，但冲空仍可能发生（被目标移开或撞墙），所以轮询等到全部成立。
 */
Smoke.scenario("wildcharge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("rain");
    var caster = stage.pokemon({ species: "Zebstrika", level: 45, moves: ["wildcharge"], at: [-2.5, 0, 0] });
    // 血厚、只带跃起：扛得住带电撞击，湿透后的必然传导与反噬都能被观察到。
    var foe = stage.pokemon({ species: "Snorlax", level: 45, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("wildcharge", caster) > 0 && stage.damageTo(caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/paralysis");
    }, function () {
        stage.expect(stage.casts("wildcharge", caster) > 0, "wildcharge was committed");
        stage.expect(stage.damageTo(foe) > 0, "the electrified charge landed");
        stage.expect(stage.damageTo(caster) > 0, "the circuit recoil hurt the user");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/paralysis"), "the soaked target was conducted into paralysis");
        stage.note("雨中双方湿身：湿身目标不掷概率、必然传导一次麻痹；施法者湿身使反噬更重。", {
            casts: stage.casts("wildcharge", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            paralyzed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "wildcharge lands, conducts the soaked target, and the circuit costs the user");
});
