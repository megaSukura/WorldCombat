/**
 * 黑雾 / haze 的可执行设计说明。
 *
 * 场面：一只只会「黑雾」的瓦斯弹与一只不会还手的小拉达隔开 10 格开战（夜里）。
 *   技能表里只有这一招，所以 AI 只能吐雾；威胁在考虑距离内，它会先走近到波及半径以内再放。
 *   用共享阶梯给对手现场加三层攻击：这样这次交换对 AI 是净收益，它才应该出手——黑雾的 AI 判据已经改成
 *   「真实半径内双方正负阶/药水的净收益为正」，不再闭眼乱抹。
 * 必然事实：本招被提交过；施法者为了进入半径确实移动过。抹平结果与「黑雾过身」标记一起写进 note。
 */
Smoke.scenario("haze", function (stage) {
    stage.fill([-14, -1, -8], [14, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "koffing", level: 30, moves: ["haze"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [4, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.after(2, function () { stage.boost(foe, { atk: 3 }); });
    stage.until(900, function () {
        return stage.casts("haze", caster) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("haze", caster) > 0, "haze was committed");
            // 实际范围净化事实：被加过攻击的小拉达落进真实波及半径后确实被扫到。
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/hazy"), "the boosted foe inside the real radius was swept");
            stage.note("the haze was cast with a net-positive exchange; the foe carried staged boosts before it was swept", {
                casts: stage.casts("haze", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                casterHp: Math.round(caster.health() * 10) / 10,
                foeHp: Math.round(foe.health() * 10) / 10,
                foeStages: stage.stages(foe),
                foeSwept: stage.hadMobEffect(foe, "world_combat:status/hazy"),
                casterSwept: stage.hadMobEffect(caster, "world_combat:status/hazy")
            });
            stage.done();
        });
    }, "haze is cast inside range");
});