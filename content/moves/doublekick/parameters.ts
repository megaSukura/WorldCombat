/**
 * 二连踢 / doublekick —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**格斗**／物理／威力 30／命中 100／PP 30／接触（`contact: 1`）／单体／连续 2 次
 *   （`multihit: 2`）。介绍：「用2只脚踢飞对手进行攻击。连续2次给予伤害。」全项目 81 位学习者，是最早能学的连击之一。
 *
 * 翻译：把「用两只脚踢」落成一记**交替两脚**——第一脚贴地低扫把对手挑离地面，第二脚顺势前踹把它送出去。
 *   两脚方向不同：第一脚主要向上（`lift`），第二脚主要向前（`push`），所以被打中的人先离地、再被踹飞。
 *   这是它和同族分开的地方：双尾扫（doublehit）是尾巴原地左右横扫、往两侧推；三连踢是同一方向连踢三脚；
 *   双刃拍（dualchop）是两面劈砍；双光束/双针都是远程弹道。只有二连踢是**一脚挑起、一脚踢飞**的近身两拍。
 *
 * 数据分散（每一项读不同的精灵数据，小差距才会在场上看得出来）：
 *   hook      第一脚威力：速度（低扫要快）＋少量物攻；回扫式为控制服务，每脚更轻。
 *   finisher  第二脚威力：物攻（踹得有多沉）＋等级；配置决定轻重。
 *   reach     踢击距离：身高（腿长）＋速度；也是本招实际射程来源。
 *   span      身前扇面张角：碰撞箱宽度（身架越宽踢得越开）。
 *   lift      第一脚挑起高度：物攻；「连踢式」关闭时归零（两脚都走低平）。
 *   push      第二脚踹飞距离：物攻＋体重；「交替式」更远。
 *   gap       两脚间隔：速度（收腿再踢的快慢）。
 *   dust      扬尘数量：物攻，直接驱动粒子发射量。
 *   tempo/recover/recharge：速度与等级。
 *
 * 配置 `alternate`（交替式，默认开）双向取舍：开启＝第一脚挑起、第二脚踹飞，把人从地上踢起来再送走（控制局）；
 *   代价是每脚 ×0.92、间隔与收招各 +1 刻。关闭（连踢式）＝两脚都走低平、不挑人，每脚 ×1.08、间隔 −1 刻，
 *   出手更快更重，但少了把对手挑离地面的那一下。两向各有适用局面：压制/连控用交替，抢血用连踢。
 *
 * 伤害段 hook／finisher：每一脚各自结算一次接触伤害，规格空（共享结算乘入物攻/速度段、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const doublekickId = "doublekick";
    export const doublekickScene = "world_combat:move_doublekick";
    export const doublekickLiftText = "world_combat.move.doublekick.text.lift";
    export const doublekickLaunchText = "world_combat.move.doublekick.text.launch";

    actionParameters.define(doublekickId, {
        /** 第一脚威力：基础 30，速度每比 55 快 1 加 0.14（夹 -5..14），物攻每比 55 多 1 加 0.06（夹 -3..7）；交替 ×0.92 / 连踢 ×1.08；夹 16..52。 */
        hook: formula(
            F.base(30)
                .plus(F.stat("speed").minus(55).times(0.14).clamp(-5, 14))
                .plus(F.stat("attack").minus(55).times(0.06).clamp(-3, 7))
                .times(F.when(F.pref("alternate"), F.const(0.92), F.const(1.08)))
                .clamp(16, 52).round(1),
            "第一脚威力", {
                unit: "威力",
                description: "低扫那一脚各自结算的威力；出手越快踢得越利落，物攻也帮一点。对手物防、相性与暴击在命中时另算。"
            }),
        /** 第二脚威力：基础 30，物攻每比 55 多 1 加 0.22（夹 -7..20），等级每比 20 高 1 加 0.05（夹 0..2.5）；交替 ×0.92 / 连踢 ×1.08；夹 16..60。 */
        finisher: formula(
            F.base(30)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-7, 20))
                .plus(F.level().minus(20).times(0.05).clamp(0, 2.5))
                .times(F.when(F.pref("alternate"), F.const(0.92), F.const(1.08)))
                .clamp(16, 60).round(1),
            "第二脚威力", {
                unit: "威力",
                description: "顺势前踹那一脚各自结算的威力；物攻越高踹得越沉，等级越高收势越足。对手物防、相性与暴击在命中时另算。"
            }),
        /** 踢击距离：基础 2.7 格，身高每比 1.4 高 1 格加 0.5（夹 -0.2..0.8），速度每比 55 快 1 加 0.004（夹 -0.15..0.4）；夹 2.2..3.8。 */
        reach: formula(
            F.base(2.7)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.4))
                .clamp(2.2, 3.8).round(2),
            "踢击距离", {
                unit: "格",
                description: "一脚直踢能够到多远；腿越长、出手越快够得越远。它也是本招的实际射程来源。"
            }),
        /** 身前张角：基础 80 度，身宽每比 0.9 宽 1 格加 40 度（夹 -12..60）；夹在 60..170。 */
        span: formula(
            F.base(80).plus(F.body("width").minus(0.9).times(40).clamp(-12, 60)).clamp(60, 170).round(0),
            "身前张角", {
                unit: "度",
                description: "每一脚在身前罩住的总角度；身架越宽的个体踢面越宽。画面里那个扇面就是判定范围。"
            }),
        /** 挑起高度：基础 0.35 格，物攻每比 55 多 1 加 0.004（夹 -0.1..0.3）；交替 ×1 / 连踢 ×0；夹 0..0.85。 */
        lift: formula(
            F.base(0.35)
                .plus(F.stat("attack").minus(55).times(0.004).clamp(-0.1, 0.3))
                .times(F.when(F.pref("alternate"), F.const(1), F.const(0)))
                .clamp(0, 0.85).round(2),
            "挑起高度", {
                unit: "格",
                description: "第一脚把对手挑离地面多高；物攻越大挑得越高。连踢式关闭挑人，这个值为 0。"
            }),
        /** 踹飞距离：基础 0.55 格，物攻每比 55 多 1 加 0.004（夹 -0.1..0.3），体重每比 60 重 1 加 0.002（夹 -0.1..0.25）；交替 ×1.1；夹 0.3..1.5。 */
        push: formula(
            F.base(0.55)
                .plus(F.stat("attack").minus(55).times(0.004).clamp(-0.1, 0.3))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.1, 0.25))
                .times(F.when(F.pref("alternate"), F.const(1.1), F.const(1)))
                .clamp(0.3, 1.5).round(2),
            "踹飞距离", {
                unit: "格",
                description: "第二脚把目标沿踢击方向送出去多远；力量与份量越大推得越远。"
            }),
        /** 两脚间隔：基础 4 刻，速度每比 55 快 1 减 0.02（夹 -1..1.2），交替 +1 / 连踢 −1；夹 2..7。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.2))
                .plus(F.when(F.pref("alternate"), F.const(1), F.const(-1))).clamp(2, 7).round(0),
            "两脚间隔", "第一脚与第二脚之间隔多久；速度越快连得越紧，交替式多花一拍把脚收回来。"),
        /** 扬尘数量：基础 14，物攻每比 55 多 1 加 0.12（夹 -4..14）；夹在 10..36。 */
        dust: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 14)).clamp(10, 36).round(0),
            "扬尘数量", {
                unit: "点",
                description: "每一脚带起的尘土数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 6 刻，速度每比 55 快 1 减 0.025（夹 -1.2..2）；夹 3..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.2, 2)).clamp(3, 10).round(0),
            "起手", "单脚站定、另一只脚抬起来的时间；速度越快越短。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5），交替 +1；夹 3..10。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("alternate"), F.const(1), F.const(0))).clamp(3, 10).round(0),
            "收招", "两脚踢完落回站姿的时间；速度越快收得越快。"),
        /** 冷却：基础 16 刻，等级每比 20 高 1 减 0.1（夹 0..3）；夹 10..22。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(20).times(0.1).clamp(0, 3)).clamp(10, 22).round(0),
            "冷却", "再起一轮二连踢前的等待；等级越高回得越快。PP 30 让它能反复使用。")
    });

    defineDamage(doublekickId, "hook", {}, { contact: true });
    defineDamage(doublekickId, "finisher", {}, { contact: true });

    stages(doublekickId, [
        { level: 22, values: { hook: 34, finisher: 38 } },
        { level: 40, values: { hook: 40, finisher: 46, lift: 0.5 } }
    ]);

    describe(doublekickId, [
        { key: "description.0", values: ["hook","finisher","lift","push"] },
        { key: "description.1", values: ["reach","span","gap"] },
        { key: "alternate.on", values: [], when: function (context) { return read(context.detail.values, ["alternate"]) === true; } },
        { key: "alternate.off", values: [], when: function (context) { return read(context.detail.values, ["alternate"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hook", "tier.0.finisher"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hook", "tier.1.finisher"] }
    ]);
}
