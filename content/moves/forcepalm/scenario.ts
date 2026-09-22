/**
 * 发劲的可执行设计说明。
 *
 * 场面：一只会发劲的幕下力士（Makuhita，20 级），面对 3 格外一只只带跃起、不还手的果然翁（Wobbuffet，36 级）。
 * AI 只有这一招，会先走到贴身距离再出手。
 * 必然事实：本招被提交过；目标受到过伤害（掌心贴上）。
 * 是否让目标麻痹属于概率结果（本单元 numbChance 约 30%），写进 note 供读轨迹判断。
 */
Smoke.scenario("forcepalm", function (stage) {
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Makuhita", level: 20, moves: ["forcepalm"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("forcepalm", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("forcepalm", caster) > 0, "forcepalm was committed");
        stage.expect(stage.damageTo(foe) > 0, "the palm shock wave dealt damage on contact");
        stage.note("发劲是接触招式：AI 先走到贴身距离再上步按掌。麻痹是约 30% 的概率（本单元 numbChance），"
            + "透劲式（配置）才会打到身后的第二个目标；本场用默认崩劲式、单体目标。",
            { casts: stage.casts("forcepalm", caster), damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10, foeAlive: foe.alive() });
        stage.done();
    }, "forcepalm lands on contact");
});
