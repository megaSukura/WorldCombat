/**
 * 念力 / confusion —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 50／命中 100／PP 25／单体，命中后 10% 概率使目标混乱
 *   （Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「微弱的念力」落成一枚**又快又便宜的念弹**——眉间聚成一点紫光、贴着地面直线窜出去，
 * 命中即炸开一圈扭曲的紫环；挨到的人偶尔被搅得恍惚。它是本组里最省最快的一发：威力低、冷却短、
 * 出手快；代价是单发什么都不够重。它独有的读法在恍惚的后果：被念力缠住的人每次想出手都会被
 * 当场再敲一下（掉一点血、恍惚续上），越是想反打越被磨——区别于迷昏拳（反噬自伤）、
 * 水之波动（耳鸣减速）、奇异之光（命中后自伤）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   pulse         念弹威力：特攻定念力压强，等级让挤压更深。
 *   reach         射程：特攻决定这枚念弹能送多远。
 *   velocity      弹速：速度决定念弹窜得多急。
 *   radius        念弹判定半径：体型高度决定粗细。
 *   confuseChance 恍惚概率：原生 10% 起，特攻与等级提高咬住的机会。
 *   dazeTicks     恍惚时长：特攻与等级决定缠多久。
 *   fumble        恍惚失手率：混乱期间每次想出手被打散的概率，存进载体振幅。
 *   motes         紫光数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `focus`（凝念）双向取舍：开启＝威力 ×1.18、恍惚更久更易触发、失手率 +0.05，但射程 ×0.85、
 * 判定更细、弹速 ×0.88、起手 +2、冷却 +5；关闭（散念）＝更快更远更便宜的一发，代价是单发更轻、
 * 恍惚更少见。两个方向各有适用局面（远距骚扰 vs 近身压制）。
 *
 * 伤害段 `pulse`：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const confusionId = "confusion";
    export const confusionScene = "world_combat:move_confusion";
    export const confusionEffect = "world_combat:confusion_pulse";
    export const confusionDazeText = "world_combat.move.confusion.text.daze";
    export const confusionChipText = "world_combat.move.confusion.text.chip";

    actionParameters.define(confusionId, {
        /** 念弹威力：44 + 特攻偏移[−14,32] + 等级(≥20)偏移[0,10]，凝念 ×1.18；夹 30..96。 */
        pulse: formula(
            F.base(44)
                .plus(F.stat("specialAttack").minus(50).times(0.24).clamp(-14, 32))
                .plus(F.level().minus(20).times(0.3).clamp(0, 10))
                .times(F.when(F.pref("focus"), F.const(1.18), F.const(1)))
                .clamp(30, 96).round(1),
            "念弹威力", {
                unit: "威力",
                description: "念弹命中那一下的基础威力；特攻越高念力越沉，等级让挤压更深。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：11 + 特攻偏移[−1.5,4]，凝念 ×0.85；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(50).times(0.05).clamp(-1.5, 4))
                .times(F.when(F.pref("focus"), F.const(0.85), F.const(1)))
                .clamp(8, 16).round(2),
            "射程", {
                unit: "格",
                description: "念弹能送到多远；特攻越高越远，凝念更近。它也是本招的实际射程来源，直接影响指示器与目标接受范围。"
            }),
        /** 弹速：1.5 + 速度偏移[−0.2,0.5]，凝念 ×0.88；夹 1.1..2.2。 */
        velocity: formula(
            F.base(1.5)
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("focus"), F.const(0.88), F.const(1)))
                .clamp(1.1, 2.2).round(2),
            "弹速", {
                unit: "格/刻",
                description: "念弹飞行的速度；速度快的个体窜得更急，目标更难走位躲开。凝念更沉、飞得慢一点。"
            }),
        /** 判定半径：0.30 + 碰撞箱高度偏移[−0.04,0.15]，凝念 ×0.8；夹 0.24..0.5。 */
        radius: formula(
            F.base(0.30)
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.15))
                .times(F.when(F.pref("focus"), F.const(0.8), F.const(1)))
                .clamp(0.24, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "念弹飞行途中的判定粗细；体型越高念弹越大。它也是画面上那团紫光的尺寸来源。"
            }),
        /** 恍惚概率：10% + 特攻偏移[−4%,12%] + 等级偏移[0,6%]，凝念 ×1.4；夹 8%..38%。 */
        confuseChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(50).times(0.0015).clamp(-0.04, 0.12))
                .plus(F.level().minus(20).times(0.0012).clamp(0, 0.06))
                .times(F.when(F.pref("focus"), F.const(1.4), F.const(1)))
                .clamp(0.08, 0.38).round(3),
            "恍惚概率", "命中后让目标陷入恍惚的概率；原生 10% 起，特攻与等级越高越容易咬住，凝念更容易。"),
        /** 恍惚时长：150 + 特攻偏移[−20,60] + 等级(≥25)偏移[0,50] 刻，凝念 ×1.25；夹 110..320。 */
        dazeTicks: seconds(
            F.base(150)
                .plus(F.stat("specialAttack").minus(50).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("focus"), F.const(1.25), F.const(1)))
                .clamp(110, 320).round(0),
            "恍惚时长", "被念力缠住后陷入恍惚的时长；特攻越高、等级越高缠得越久，凝念更长。"),
        /** 失手率：28% + 特攻偏移[−5%,10%]，凝念 +5%；夹 18%..48%。 */
        fumble: percent(
            F.base(0.28)
                .plus(F.stat("specialAttack").minus(50).times(0.0012).clamp(-0.05, 0.1))
                .plus(F.when(F.pref("focus"), F.const(0.05), F.const(0)))
                .clamp(0.18, 0.48).round(3),
            "恍惚失手率", "恍惚期间目标每次想出手被打散的概率；特攻越高的施法者搅得越乱，凝念更乱。"),
        /** 紫光数：10 + 特攻偏移[0,20] + 等级(≥20)偏移[0,10]；夹 10..44。 */
        motes: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(50).times(0.14).clamp(0, 20))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .clamp(10, 44).round(0),
            "紫光数", {
                unit: "点",
                description: "命中时炸开的紫光数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：9 − 速度偏移[−2.5,3]，凝念 +2；夹 5..14。 */
        tempo: seconds(
            F.base(9)
                .minus(F.stat("speed").minus(60).times(0.035).clamp(-2.5, 3))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把念力聚到眉间再弹出去的时间；速度越快越短，凝念多蓄两刻。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 4..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "念弹脱手后的收势；速度越快越利落。"),
        /** 冷却：16 − 速度偏移[−3,5]，凝念 +5；夹 10..30。 */
        recharge: seconds(
            F.base(16)
                .minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("focus"), F.const(5), F.const(0)))
                .clamp(10, 30).round(0),
            "冷却", "再次弹出一枚念弹前的等待；它是本组最短的冷却，换来的是单发最轻。")
    });

    defineDamage(confusionId, "pulse", {});

    stages(confusionId, [
        { level: 26, values: { pulse: 56 } },
        { level: 40, values: { pulse: 64, confuseChance: 0.20 } }
    ]);

    describe(confusionId, [
        { key: "description.0", values: ["pulse"] },
        { key: "description.1", values: ["confuseChance", "dazeTicks", "fumble"] },
        { key: "description.2", values: ["reach", "velocity", "motes"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pulse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pulse", "tier.1.confuseChance"] }
    ]);
}
