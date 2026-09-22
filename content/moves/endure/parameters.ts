/**
 * 挺住 / endure 的参数。
 *
 * 原生事实：Normal、Status、自身、优先度 +4、PP 10；即使受到攻击，也至少会留下 1 HP，连续使出则容易失败（Cobblemon 1.8 数据）。
 * 翻译：直接映射到共享 GuardEffects 的 survive 模式——**不减免伤害**，只在“这一下会把你打死”时把结果截在 1 HP，
 * 所以它是背水一战的保命键而不是免伤键。特防与等级决定窗口长短，等级决定可保命次数与冷却，速度决定咬牙快慢。
 * 配置 scramble 在“挣扎（短窗口可走位）”与“屹立（长窗口定身、事后力竭）”之间取舍。
 */
namespace PokemonSkills {
    actionParameters.define("endure", {
        /** 咬牙时间：基础 8 刻，速度每比 60 快 1 少 0.03 刻，夹在 4..10。 */
        raise: formula(
            F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(4, 10).round(0),
            "咬牙时间", {
                unit: "刻",
                description: "从起手到挺住窗口打开的时间；反应快的个体咬得更快。"
            }),
        /** 挺住窗口：基础 26 刻，特防每比 60 高 1 +0.16 刻，30 级起每级 +0.15 刻；挣扎 ×0.75、屹立 ×1.25，夹在 16..56。 */
        window: formula(
            F.base(26)
                .plus(F.stat("specialDefence").minus(60).max(0).times(0.16))
                .plus(F.level().minus(30).max(0).times(0.15))
                .times(F.when(F.pref("scramble"), F.const(0.75), F.const(1.25)))
                .clamp(16, 56).round(0),
            "挺住窗口", {
                unit: "刻",
                description: "能挡下致命一击的时间；特防越高、越老练撑得越久，挣扎取向窗口更短。"
            }),
        /** 保命次数：等级 60 起 2 次，否则 1 次。 */
        charges: formula(
            F.when(F.level().gte(60), F.const(2), F.const(1)).round(0),
            "保命次数", {
                unit: "次",
                description: "窗口内能把致命一击截住的次数；等级 60 起为 2 次。"
            }),
        /** 保命后生命：至少留下 1 HP。 */
        minimumHealth: hidden(1),
        /** 冷却：基础 90 刻 + 等级 ×0.6，夹在 90..150。 */
        charge: formula(
            F.base(90).plus(F.level().times(0.6)).clamp(90, 150).round(0),
            "冷却", {
                unit: "刻",
                description: "再次咬牙前的等待；保命技能代价高，等级越高越久。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出则容易失败”：连着硬撑会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240),
        /** 力竭时长：挣扎 0 刻、屹立 30 刻（用世界已有的定身表达）。 */
        grit: formula(
            F.when(F.pref("scramble"), F.const(0), F.const(30)).round(0),
            "力竭时长", {
                unit: "刻",
                description: "屹立取向用掉保命次数后的短暂定身；挣扎取向没有这一项。"
            })
    });

    describe("endure", [
        { key: "description.0", values: ["window", "charges"] },
        { key: "description.1", values: ["raise", "charge", "grit"] },
        { key: "description.2", values: ["fizzle", "pref.scramble"] }
    ]);
}
