/**
 * 发劲的可执行设计说明。
 *
 * 场面：一只会发劲的幕下力士（Makuhita，20 级），正前方 1.4 格与 3.4 格各站一只只带跃起、不还手的果然翁
 * （Wobbuffet，36 级），排在同一条直线上（已 NoAI，保持对齐，便于读透劲是否沿真实方向打到身后）。
 * 必然事实：本招被提交过；主目标受到过伤害（掌心贴上，短 trace 定主敌）。
 * 透劲式是否透到身后的第二只、是否让目标麻痹属于设计/概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("forcepalm", function (stage) {
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Makuhita", level: 20, moves: ["forcepalm"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [1.4, 0, 0] });
    var back = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [3.4, 0, 0] });
    stage.noai(foe, back);
    // 读改版后的透劲：主击成功后从真实命中点往后扫同一条窄带；等一瞬让个体进入观察再改配置并对立。
    stage.after(5, function () {
        stage.prefer(caster, "forcepalm", { through: true });
        stage.hostile(caster, foe);
        stage.hostile(caster, back);
    });
    stage.until(900, function () {
        return stage.casts("forcepalm", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("forcepalm", caster) > 0, "forcepalm was committed");
        stage.expect(stage.damageTo(foe) > 0, "the palm shock wave dealt damage on contact");
        stage.note("发劲是接触招式：AI 先走到贴身距离、再做短 trace 定主敌；透劲式下主击成功后才从真实命中点往后扫窄带，"
            + "身后的第二只若仍在窄带内就吃到透劲，侧边目标不受旁伤。麻痹是概率结果（本单元 numbChance）。",
            { casts: stage.casts("forcepalm", caster), onMain: Math.round(stage.damageTo(foe) * 10) / 10,
                onBack: Math.round(stage.damageTo(back) * 10) / 10, throughHit: stage.damageTo(back) > 0,
                paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10, foeAlive: foe.alive() });
        stage.done();
    }, "forcepalm lands on contact");
});
