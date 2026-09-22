/**
 * 辅助力量 / storedpower —— 可执行设计说明。
 *
 * 一句话：把身上攒的能力等级以自己为圆心一次放出去，圈里的每个对手都吃一记灵能新星。
 *
 * 场面：一只只会辅助力量的太阳伊布（35 级）站在两只只会「跃起」、不还手的低等级小拉达中间（一左一右各 2.2 格），
 *   逼出「以自己为圆心罩住一圈」的局面：两只小拉达都在释放半径内。
 * 必然事实：本招被提交过；**圈里的两个目标都挨到了伤害**——这一条正是范围释放与单体招的分界。
 * 命中数值、是否暴击、掀飞多远写进 note；本次场上没有蓄积等级，威力取基础档（玩家实际操作时先叠等级再放）。
 */
Smoke.scenario("storedpower", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "espeon", level: 35, moves: ["storedpower"], at: [0, 0, 0] });
    var foeA = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [2.2, 0, 0] });
    var foeB = stage.pokemon({ species: "rattata", level: 12, moves: ["splash"], at: [-2.2, 0, 0.4] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("storedpower", caster) > 0 && stage.damageTo(foeA) > 0 && stage.damageTo(foeB) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("storedpower", caster) > 0, "espeon committed stored power");
            stage.expect(stage.damageTo(foeA) > 0 && stage.damageTo(foeB) > 0, "the nova caught both foes inside its ring");
            stage.note("the ring centred on the caster caught both foes; the boost term was 0 in this arena, so this is the base tier - a player stacks stages first, then releases", {
                casts: stage.casts("storedpower", caster),
                foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                foeAMoved: Math.round(stage.travelled(foeA) * 10) / 10
            });
            stage.done();
        });
    }, "stored power releases over both foes within 45 s");
});
