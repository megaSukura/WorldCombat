/**
 * 磨爪 / honeclaws 的参数与数值来源。
 *
 * 原生事实：Dark／变化／威力 0／命中必中／PP 15／目标 self／boosts { atk: +1, accuracy: +1 }。
 *   178 个已实装学习者，是本组里最常见的一支。
 *
 * 翻译：把「将爪子磨得更加锋利」翻成即时战斗里一件**又快又便宜的小事**——施术者抬起前爪、在身前交叠着
 *   刮几下，火星从爪缝里迸出来；磨出的锋口留在一段时间里，攻击与命中率各抬一档。它和同族最像的盘蜷一样抬
 *   命中，但盘蜷是慢而完整的架势；磨爪是随手一蹭：起手与冷却都短、窗口也短，锋口掉了就再磨一次。
 *   取原生「攻 +1、命中 +1、必中、纯自我强化」；放弃回合制里永久保留的等级——即时交战里「锋口」以可见窗口
 *   存在，窗口走完一并收回，对手因此有一次拖过它的反制。
 *
 * 数值来源（每个参数读不同的精灵数据／现场事实，分散到不同参数上）：
 *   rise      物攻增益：原生 1 级；配置「深磨」多 1 级（夹 1..2），是这招的身份而不是成长点。
 *   focus     命中增益：原生 1 级；出手越快磨得越准，速度每比 60 快 100 再多 1 级（夹 1..2）。
 *   edge      锋口窗口：基础 120 刻 ＋ 等级 ×2 ＋ 物攻 ×0.35，夹 90..240；深磨 ×0.7（磨得深、留得短）。
 *   scrapes   刮擦次数（同时是火星数）：物攻与速度派生，夹 12..40。
 *   tempo     起手：速度每比 60 快 1 减 0.03 刻，夹 4..12；深磨 +4 刻。
 *   aftercast 收招：基础 4 刻 ＋ 碰撞箱高度 ×0.8，夹 4..8。
 *   wait      冷却：基础 72 刻 − 等级 ×0.5，夹 40..90；深磨 +10。PP 15 的代价，冷却短到可以反复补。
 * 配置 deep（深磨）双向取舍：开启＝物攻多抬 1 级，但起手 +4 刻、冷却 +10、锋口窗口 ×0.7（磨得利却难维持）；
 *   关闭＝快磨，出手快、窗口长、冷却短，只是物攻只 +1。两向各有适用局面：要一轮爆发时深磨，要长时间压制时快磨。
 */
namespace PokemonSkills {
    actionParameters.define("honeclaws", {
        /** 物攻增益：原生 +1，深磨再多 1 级。 */
        rise: formula(
            F.base(1).plus(F.when(F.pref("deep", text("worldcombat.skill.honeclaws.preference.deep")), F.const(1), F.const(0))).clamp(1, 2),
            "物攻增益", {
                unit: " 级",
                description: "这次磨爪把物攻抬高多少级；原生「提高攻击」的对位，深磨再多一级。"
            }),
        /** 命中增益：出手越快磨得越准。 */
        focus: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.01).clamp(0, 1)).round(0).clamp(1, 2),
            "命中增益", {
                unit: " 级",
                description: "这次磨爪把命中能力等级抬高多少级；速度每比 60 快 100 再多一级。对宝可梦落到原生命中等级。"
            }),
        /** 锋口窗口：留在爪上的时长。 */
        edge: seconds(
            F.base(120).plus(F.level().times(2)).plus(F.stat("attack").times(0.35))
                .times(F.when(F.pref("deep", text("worldcombat.skill.honeclaws.preference.deep")), F.const(0.7), F.const(1)))
                .clamp(90, 240).round(0),
            "锋口窗口", "磨出的锋口在爪上留多久；等级与物攻越高留得越久，深磨磨得利却留得短。窗口走完，这次抬起的等级一并收回。"),
        /** 刮擦次数：物攻与速度派生，直接驱动画面里的火星数。 */
        scrapes: formula(
            F.base(14).plus(F.stat("attack").div(6)).plus(F.stat("speed").div(10)).clamp(12, 40).round(0),
            "刮擦次数", {
                unit: " 次",
                description: "一次磨爪刮几下（也是迸出的火星粒子总数）；物攻与速度越高刮得越密。"
            }),
        /** 起手：速度决定磨多快。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.honeclaws.preference.deep")), F.const(4), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "抬爪、交叠刮擦需要多久；速度越高越快，深磨多花 4 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(0.8)).clamp(4, 8).round(0),
            "收招", "收爪定势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(72).minus(F.level().times(0.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.honeclaws.preference.deep")), F.const(10), F.const(0)))
                .clamp(40, 90).round(0),
            "冷却", "两次磨爪之间的等待；等级越高越短，深磨更长。PP 15 的代价。")
    });

    stages("honeclaws", [
        { level: 35, values: { edge: 200, wait: 54 } },
        { level: 55, values: { edge: 250, wait: 44 } }
    ]);

    describe("honeclaws", [
        { key: "description.0", values: ["rise", "focus", "scrapes"] },
        { key: "description.1", values: ["edge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.edge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.edge"] }
    ]);
}
