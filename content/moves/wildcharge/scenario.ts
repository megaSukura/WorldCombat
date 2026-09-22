/**
 * 疯狂伏特 / wildcharge 的可执行设计说明。
 *
 * 场面：会疯狂伏特的斑斑马（Zebstrika）对一只只会跃起、不会还手的鲤鱼王（Magikarp）。
 * 必然事实：本招被提交过；它命中过靶子且施法者因此掉过血（反作用力）。命中 100，但冲空仍可能发生
 * （被目标移开或撞墙），所以轮询等到至少命中一次。是否灌入麻痹是概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("wildcharge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Zebstrika", level: 45, moves: ["wildcharge"], at: [-2.5, 0, 0] });
    var foe = stage.pokemon({ species: "Magikarp", level: 20, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("wildcharge", caster) > 0 && stage.damageTo(caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("wildcharge", caster) > 0, "wildcharge was committed");
        stage.expect(stage.damageTo(foe) > 0, "the electrified charge landed");
        stage.expect(stage.damageTo(caster) > 0, "the circuit recoil hurt the user");
        stage.note("麻痹是概率结果（默认约 12%），这里只记录是否被灌入", {
            casts: stage.casts("wildcharge", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            paralyzed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "wildcharge lands, paralyzes or not, and the circuit costs the user");
});
