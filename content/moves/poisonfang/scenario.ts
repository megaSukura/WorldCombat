/**
 * 剧毒牙 / poisonfang 的可执行设计说明。
 *
 * 场面：只会剧毒牙的叉字蝠（crobat，L40，原生学习者）对 5 格外的卡比兽（snorlax，L50，只会跃起）；
 * 平地、白天晴天。开战后 AI 只有这一招可用，必须自己走近再咬。
 * 必然事实：本招被提交过；目标受到过咬合伤害。
 * 毒在咬后隔 pump 刻才渗开（toxicChance 决定剧毒还是普通中毒，目标原本已中毒时确保剧毒），
 * 是否中毒/剧毒、扑空还是咬中、暴击，都是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("poisonfang", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crobat", level: 40, moves: ["poisonfang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("poisonfang", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("poisonfang", caster) > 0, "poisonfang was committed");
            stage.expect(stage.damageTo(foe) > 0, "the poison fang dealt damage");
            stage.note("the venom seeps in pump ticks after the bite; toxicChance chooses toxic over plain poison, and an already poisoned target is upgraded for sure", {
                casts: stage.casts("poisonfang", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                poisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                toxic: stage.hadMobEffect(foe, "world_combat:status/toxic"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "poison fang lands on a foe within range");
});
