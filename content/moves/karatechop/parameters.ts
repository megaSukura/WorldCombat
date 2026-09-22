/**
 * 空手劈 / karatechop —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，16 位学习者）：Fighting／物理／威力 50／命中 100／PP 25／接触／
 *   critRatio 2（暴击率高出一档）。原生描述：「用锋利的手刀劈向对手进行攻击，容易击中要害。」
 *
 * 翻译：把「锋利的手刀」落成一记**瞬发贴身的劈**——没有任何起手：按下就落，落点是一道竖直的白线；
 *   距离极短、单点、便宜，是可以在移动与连打之间随手甩出的压力招。手刀专找护甲的缝，
 *   因此比同族更少吃防御减免（伤害段 `chop` 的 defenceCoefficient 更低），对高防御目标衰减更慢。
 *   原生的「容易击中要害」沿用 critRatio 2 的共享结算；它是本族最快、最短、最省的一记。
 *
 * 数值分散（每个参数读不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   chop    手刀威力：物攻定刃口，等级定发力；手刀式更重、空手式更轻。
 *   reach   劈距：碰撞箱宽度决定够得到多近的目标，它也是实际射程；手刀式收短、空手式伸长。
 *   depth   劈深：身高决定这一记从脚上压到多高，也是画面里那道竖线的高度。
 *   shards  崩屑量：物攻与速度换算，驱动表现密度。
 *   aftercast／recharge：速度定收招与冷却；它没有起手，节奏全压在冷却上。
 *
 * 配置 `knife`（手刀式）双向取舍（默认关）：
 *   开（手刀）：威力 ×1.10，代价是劈距 −0.2 格——够得更短、单发更重。
 *   关（空手）：劈距 +0.3 格，代价是威力 ×0.92——够得更远、单发更轻。
 *
 * 伤害段 `chop`：手刀落下那一下的接触斩击，走共享换算（原生类别 Physical，Fighting 属性）；
 *   规格上把防御系数调低（0.0036），表达「手刀找缝」，对高防御目标衰减更慢。
 */
namespace PokemonSkills {
    export const karatechopId = "karatechop";
    export const karatechopScene = "world_combat:move_karatechop";
    export const karatechopHitText = "world_combat.move.karatechop.text.hit";
    export const karatechopCritText = "world_combat.move.karatechop.text.crit";
    export const karatechopMissText = "world_combat.move.karatechop.text.miss";
    /** 表现里劈深（竖线高度）的参考值（格）；服务端传 scale = 实际劈深 / 这个值。 */
    export const karatechopReference = 1.1;

    actionParameters.define(karatechopId, {
        /** 手刀威力：50 + (物攻−55)×0.22（夹 −10..26）+ (等级−20)×0.35（夹 0..18）；手刀 ×1.10 / 空手 ×0.92；夹 40..110。 */
        chop: formula(
            F.base(50)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-10, 26))
                .plus(F.level().minus(20).times(0.35).clamp(0, 18))
                .times(F.when(F.pref("knife", text("worldcombat.skill.karatechop.preference.knife")), F.const(1.10), F.const(0.92)))
                .clamp(40, 110).round(1),
            "手刀威力", {
                unit: "威力",
                description: "手刀落下那一下的接触威力；物攻给出刃口、等级给出发力，手刀式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 劈距：1.9 + (碰撞箱宽度−0.9)×0.15（夹 −0.05..0.25）；手刀 −0.2 / 空手 +0.3；夹 1.5..2.4 格。它也是实际射程。 */
        reach: formula(
            F.base(1.9).plus(F.body("width").minus(0.9).times(0.15).clamp(-0.05, 0.25))
                .plus(F.when(F.pref("knife", text("worldcombat.skill.karatechop.preference.knife")), F.const(-0.2), F.const(0.3)))
                .clamp(1.5, 2.4).round(2),
            "劈距", {
                unit: "格",
                description: "手刀能够到的贴身距离；身板越宽够得越远，空手式伸得更长。它也是本招实际射程。"
            }),
        /** 劈深：1.1 + (身高−1.4)×0.35（夹 −0.15..0.5）；夹 0.8..1.8 格。 */
        depth: formula(
            F.base(1.1).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.5)).clamp(0.8, 1.8).round(2),
            "劈深", {
                unit: "格",
                description: "这一记从脚上压到多高；高大的个体劈得更深，画面里那道竖线就有多高。"
            }),
        /** 崩屑量：14 + (物攻−55)×0.25（夹 −3..20）+ (速度−55)×0.1（夹 −2..6）；夹 10..42 个。 */
        shards: formula(
            F.base(14)
                .plus(F.stat("attack").minus(55).times(0.25).clamp(-3, 20))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-2, 6))
                .clamp(10, 42).round(0),
            "崩屑量", {
                unit: "个",
                description: "手刀劈中时崩出的细屑数量，由物攻与速度换算；它驱动表现，不是独立伤害。"
            }),
        /** 收招：5 − (速度−55)×0.02（夹 −2..2）；夹 3..8 刻。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2)).clamp(3, 8).round(0),
            "收招", "手刀落完把手收回来的时间；速度越快越利落。"),
        /** 冷却：14 − (速度−55)×0.03（夹 −2..3）；夹 9..20 刻。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(9, 20).round(0),
            "冷却", "两次手刀之间的等待；速度越快回得越快。它没有起手，节奏全压在这里。")
    });

    defineDamage(karatechopId, "chop",
        { defenceCoefficient: 0.0036, rationale: "手刀专找护甲的缝：比同族更少吃防御减免，对高防御目标衰减更慢。" },
        { contact: true });

    stages(karatechopId, [
        { level: 22, values: { chop: 58 } },
        { level: 40, values: { chop: 66, reach: 2.24 } }
    ]);

    describe(karatechopId, [
        { key: "description.0", values: ["chop"] },
        { key: "description.1", values: ["reach", "depth", "shards"] },
        { key: "stance.knife", values: [], when: function (context) { return read(context.detail.values, ["knife"]) === true; } },
        { key: "stance.open", values: [], when: function (context) { return read(context.detail.values, ["knife"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop", "tier.1.reach"] }
    ]);
}
