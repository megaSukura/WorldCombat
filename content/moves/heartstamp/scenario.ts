/**
 * 爱心印章 / heartstamp —— 可执行设计说明。
 *
 * 一句话：先卖一次萌让目标进入短暂的疏忽窗口，再扑上去补一记重击；补击若落在窗口里就乘机打得更重。
 *
 * 场面：会爱心印章的跳跳猪站在平地一侧，对面一只只会撞击的小拉达。两边都会靠上去，近身交战自然会给出
 * 「卖萌 → 补击」这两拍。
 *
 * 断言只取必然事实：这招被放过；目标身上出现过共享身份 world_combat:status/offguard（卖萌必定挂上）；
 * 目标挨到过伤害（补击是逐刻 trace 的接触攻击，双方会互相靠拢）。乘机是否成立、暴击与约 30% 的畏缩掷骰，
 * 以及目标是否在卖萌间隔里走开，都写进 note 供读轨迹判断。
 */
Smoke.scenario("heartstamp", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "spoink", level: 40, moves: ["heartstamp"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("heartstamp", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("heartstamp", caster) >= 1, "spoink committed heartstamp");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/offguard"), "the feint marked the foe as off guard");
        stage.expect(stage.damageTo(foe) > 0, "the follow-up strike dealt damage");
        stage.note("the crit, the flinch roll (about 30%, multiplied while off guard), whether the follow-up landed inside the window, and the foe's movement are random/positional", {
            casts: stage.casts("heartstamp", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeOffguard: stage.hadMobEffect(foe, "world_combat:status/offguard"),
            foeFlinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            casterAlive: caster.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "heartstamp lands on the foe within 45 s");
});
