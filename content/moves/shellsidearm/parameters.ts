/**
 * 臂贝武器 / shellsidearm —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／**分类随目标而变**（原生实现比较物攻/目标物防 与 特攻/目标特防，取伤害更高的一面）／
 *   威力 90／命中 100／PP 10／单体／非接触／20% 令目标中毒。全招只有 1 位学习者（伽勒尔呆呆王一族）。
 *
 * 翻译：把「从物理攻击和特殊攻击中选择可造成较多伤害的方式」落成一发**瞄准对方软肋的毒壳重炮**——
 *   施法者把一具带毒的壳压进发射腔，发射前先看清对方哪一面软：硬壳目标吃**钝击**（物理），软肉目标吃**毒液喷射**（特殊）。
 *   同一发弹、同一份威力，只是用哪一面打由命中时的对比决定（在 `skill.ts` 与伤害段之间共用同一份比较）。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   power      重炮威力：**物攻与特攻中较高的一项**（这招的两面都吃个体最强的那面）；形态配置再微调。
 *   edge       物特差：物攻 − 特攻，作为悬浮里「这只个体偏向哪一面」的可读量。
 *   touch      近身钝击距离：碰撞箱高度（伸臂长度）；上限 3 格，实际 trace 再加身体边界；钝击专用，不受远处射程影响。
 *   shellSpeed 弹速：速度（出手利落程度）；喷射更快。
 *   shellRadius 判定：碰撞箱高度（壳的大小）；钝击用它当横扫半宽。
 *   reach      喷射射程：等级（炮术）；喷射 ×1.15。
 *   poisonChance 中毒概率：特攻（毒液分泌量）。
 *   venomTicks 中毒时长：等级＋特攻。
 *   venomCloud 毒云量：物攻与特攻较高的一项；同时是画面里毒云的粒子量。
 *   charge/settle/recharge：速度、等级与形态配置。
 *
 * 配置 `form`（发射形态，0/1/2，默认 0）双向取舍：
 *   0 自动＝先看实际距离：近处可触范围内按 CombatantStats 物特比较决定砸/喷，远处选可达的喷射；无目标默认喷射；
 *   1 钝击＝真正的短距近身横砸（物理/接触，威力 ×1.05），但只能打到 `touch` 那么近、弹速 ×0.85、起手 +2、冷却 +4；
 *   2 喷射＝有限毒液投射物（特殊/非接触，射程 ×1.15、弹速 ×1.15），但威力 ×0.95。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("shellsidearm", {
        /** 重炮威力：90 + (物攻与特攻较高的一项 − 80)×0.25 clamp(−12,30)；形态 ×[0/1.05/0.95]；夹 64..132。 */
        power: formula(
            F.base(90).plus(F.stat("attack").max(F.stat("specialAttack")).minus(80).times(0.25).clamp(-12, 30))
                .times(F.when(F.pref("form").eq(1), F.const(1.05), F.when(F.pref("form").eq(2), F.const(0.95), F.const(1))))
                .clamp(64, 132).round(1),
            "重炮威力", {
                unit: "威力",
                description: "这一发毒壳的基础威力；取物攻与特攻中较高的那一项成长，因为钝击与喷射都吃个体最强的一面。对手防御、相性与暴击在命中时另算。"
            }),
        /** 物特差：物攻 − 特攻，只在悬浮里读。 */
        edge: formula(
            F.stat("attack").minus(F.stat("specialAttack")),
            "物特差", {
                unit: "点",
                description: "大于 0 的个体更偏钝击（物理），小于 0 更偏喷射（特殊）；实际用哪一面由命中时与对方防御的对比决定。"
            }),
        /** 近身钝击距离：2.2 + 高度偏移[−0.1,0.5]；夹 1.6..3.0；trace 时再加身体边界。 */
        touch: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.1, 0.5)).clamp(1.6, 3.0).round(2),
            "钝击距离", {
                unit: "格",
                description: "近身横砸能把壳送到多远；高个子的手臂更长。上限 3 格，实际判定在身体中心之外再加一点身体边界，够不到就必须先走近。"
            }),
        /** 弹速：1.5 + 速度偏移[−0.25,0.6]；喷射 ×1.15；夹 1.0..2.6。 */
        shellSpeed: formula(
            F.base(1.5).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.25, 0.6))
                .times(F.when(F.pref("form").eq(2), F.const(1.15), F.const(1)))
                .clamp(1.0, 2.6).round(2),
            "弹速", {
                unit: "格/刻",
                description: "喷射出的毒液脱膛速度；速度快的个体推得更急，喷射式更快。"
            }),
        /** 判定半径：0.3 + 高度偏移[−0.05,0.25]；夹 0.22..0.55。 */
        shellRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.25)).clamp(0.22, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "毒壳飞行与命中时的横向判定半径；大个子的壳更大。"
            }),
        /** 喷射射程：14 + 等级(≥25)偏移[0,4]；喷射 ×1.15；夹 6..20。钝击形态改用 touch。 */
        reach: formula(
            F.base(14).plus(F.level().minus(25).times(0.1).clamp(0, 4))
                .times(F.when(F.pref("form").eq(2), F.const(1.15), F.const(1)))
                .clamp(6, 20).round(1),
            "喷射射程", {
                unit: "格",
                description: "毒液喷射能把壳打到多远；等级越高炮术越好，喷射式再远一成半。钝击形态用近身距离，不吃这个射程。"
            }),
        /** 中毒概率：0.20 + 特攻偏移[−0.05,0.16]；夹 0.12..0.4。 */
        poisonChance: percent(
            F.base(0.20).plus(F.stat("specialAttack").minus(80).times(0.0015).clamp(-0.05, 0.16)).clamp(0.12, 0.4),
            "中毒概率", "毒壳炸开时按这个概率让目标中毒；原生 20% 起，特攻越高毒液越足。"),
        /** 中毒时长：280 + 等级(≥25)偏移[0,100] + 特攻偏移[−20,60]；夹 200..520。 */
        venomTicks: seconds(
            F.base(280).plus(F.level().minus(25).times(3).clamp(0, 100))
                .plus(F.stat("specialAttack").minus(80).times(0.5).clamp(-20, 60)).clamp(200, 520).round(0),
            "中毒时长", "留下的毒持续多久；等级与特攻越高挂得越久。"),
        /** 毒云量：12 + (物攻与特攻较高的一项 − 80)×0.1 clamp(−3,12)；夹 8..28。 */
        venomCloud: formula(
            F.base(12).plus(F.stat("specialAttack").max(F.stat("attack")).minus(80).times(0.1).clamp(-3, 12)).clamp(8, 28).round(0),
            "毒云量", {
                unit: "点",
                description: "命中处炸开的毒云粒子量，随个体最强的一面增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：12 − 速度偏移[−2,4] + 钝击 2；夹 6..18。 */
        charge: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("form").eq(1), F.const(2), F.const(0))).clamp(6, 18).round(0),
            "起手", "把毒壳压进发射腔、看清对方软肋的时间；速度越快越短，钝击式多压一拍。"),
        /** 收招：9 − 速度偏移[−1,2]；夹 5..13。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 13).round(0),
            "收招", "发炮后收势的时间；速度越快收得越快。"),
        /** 冷却：34 − 等级(≥25)偏移[0,6] + 钝击 4；夹 20..46。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(25).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("form").eq(1), F.const(4), F.const(0))).clamp(20, 46).round(0),
            "冷却", "再装一发毒壳之间的等待；等级越高回得越快，钝击式更久。")
    });

    defineCategory("shellsidearm", "special");
    defineDamage("shellsidearm", "power", {});

    stages("shellsidearm", [
        { level: 35, values: { power: 98 } },
        { level: 50, values: { power: 106, venomTicks: 420 } }
    ]);

    describe("shellsidearm", [
        { key: "description.0", values: ["power","edge"] },
        { key: "description.1", values: ["reach","touch","shellSpeed","shellRadius"] },
        { key: "description.2", values: ["poisonChance","venomTicks"] },
        { key: "description.3", values: ["charge", "settle", "recharge"] },
        { key: "form.auto", values: [], when: function (context) { return read(context.detail.values, ["form"]) === 0; } },
        { key: "form.ram", values: [], when: function (context) { return read(context.detail.values, ["form"]) === 1; } },
        { key: "form.spray", values: [], when: function (context) { return read(context.detail.values, ["form"]) === 2; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.power"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.power", "tier.1.venomTicks"] }
    ]);
}
