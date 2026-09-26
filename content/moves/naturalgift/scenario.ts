/**
 * 自然之恩的可执行设计说明：给一只会这招的精灵带上树果，让它对目标出手，验证它会踏前命中并造成伤害；
 * 并验证树果真的从携带栈里被吃掉（吃完后无法再放第二次）。
 * 伤害属性与威力来自携带的 cheri_berry（火／80）与物攻成长；命中后树果被消耗，因此只断言第一击。
 * 选取为 aim，但 AI 仍为攻击用途推荐敌人；命中率、暴击与具体威力不写断言，写进 note。
 */
Smoke.scenario("naturalgift", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 2, 8], "minecraft:air");
    stage.weather("clear");
    stage.time("night");

    var caster = stage.pokemon({ species: "aipom", level: 30, moves: ["naturalgift"], item: "cobblemon:cheri_berry", at: [-2, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.noai(target);
    stage.hostile(caster, target);

    stage.until(900, function () { return stage.casts("naturalgift", caster) > 0 && stage.damageTo(target) > 0; }, function () {
        stage.after(200, function () {
            stage.expect(stage.casts("naturalgift", caster) === 1, "树果被吃掉了，这招无法再放第二次");
            stage.expect(stage.heldItem(caster) === "", "真实携带栈里少了那颗树果");
            stage.note("自然之恩先经统一装备事务把携带的 cheri_berry（火／80）吃掉并记下真正吃的是哪颗，再朝瞄准方向踏前；命中僵尸造成一记火属性物理伤害。树果只有一颗，吃完后手里为空、AI 的 available 与 ready 都不再成立，所以整场只提交一次——这是消耗的必然事实。属性与威力来自吃下的那颗果；命中率、暴击与物攻成长不写断言。",
                { casts: stage.casts("naturalgift", caster), damage: stage.damageTo(target), held: stage.heldItem(caster), travelled: stage.travelled(caster) });
            stage.done();
        });
    }, "自然之恩吃掉树果、命中并只放一次");
});
