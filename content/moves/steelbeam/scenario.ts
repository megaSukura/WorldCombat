/**
 * 铁蹄光线 / steelbeam 的可执行设计说明。
 *
 * 场面：会铁蹄光线的巨金怪（Metagross，钢属性）对 3 格外一只被点住、不会还手的铁傀儡，晴天平地。
 * 必然事实：本招被提交过；走廊里第一个目标受到过伤害；**施法者自己也受到过伤害**——固定自损是这一招的代价，
 * 且与命中无关（靶子不还手，所以施法者的掉血只可能来自这一招自己）。
 * 命中率、暴击、具体威力与撞开距离随个体数据浮动，写进 note 供读轨迹判断。
 */
Smoke.scenario("steelbeam", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Metagross", level: 45, moves: ["steelbeam"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("steelbeam", caster) > 0 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("steelbeam", caster) > 0, "steelbeam was committed");
        stage.expect(stage.damageTo(foe) > 0, "the steel lance hit the first body in the corridor");
        stage.expect(stage.damageTo(caster) > 0, "the user paid the fixed body cost");
        stage.note("钢梁只打走廊里第一个目标；自损固定为最大生命的一个比例（淬火式 ×0.65），与命中无关。命中率、暴击、撞开距离与具体威力随个体数据浮动。", {
            casts: stage.casts("steelbeam", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "steelbeam fires and the user pays with its body");
});
