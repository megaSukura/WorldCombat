/**
 * 找伙伴的可执行设计说明。
 *
 * 场面：一只只会找伙伴的爱心鱼（懒惰特性，等级 40）对 4 格外的卡蒂狗（威吓特性，没有招式）。
 *   自己的特性是拖累（懒惰），AI 愿意把它递出去；双方特性不同、都是宝可梦，预检通过。
 * 必然事实：本招被提交过；目标身上出现过共享身份 world_combat:status/entrainment 的标记
 *   （只有特性层真正写入时才会挂上）。
 * 随机结果：节拍落地前目标是否走动、波及到几只写进 note 供读轨迹判断。
 * 特性顶替走共享 NativeModifiers ability 层，smoke 不能直接读特性，实际效果记在 note 里。
 */
Smoke.scenario("entrainment", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Luvdisc", level: 40, ability: "truant", moves: ["entrainment"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, ability: "intimidate", moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: luvdisc(40, truant) entrainment vs growlithe(24, intimidate); the caster's own Ability is a liability, so the AI hands it over");
    stage.until(1200, function () { return stage.hadMobEffect(target, "world_combat:status/entrainment"); }, function () {
        stage.expect(stage.casts("entrainment", caster) >= 1, "entrainment was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/entrainment"), "the entrainment status appeared on the target");
        stage.note("entrainment committed; the target's Ability is replaced with the caster's through the shared NativeModifiers ability layer", {
            casts: stage.casts("entrainment", caster),
            casterAlive: caster.alive(),
            targetAlive: target.alive()
        });
        stage.done();
    }, "the rhythm takes hold");
});
