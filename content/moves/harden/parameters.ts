/**
 * 变硬 / harden — 参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 30、目标 self、boosts { def: +1 }。
 *
 * 翻译：把「全身使劲，让身体变硬」翻成**皮肤表面析出一层脆硬的晶壳**——硬得能把每一击都磨钝一点，
 *   可也脆：一记够重的攻击会把整层壳一次打裂，壳碎防御就跟着落回去。取原生「防御 +1、PP 30、纯自我强化」；
 *   放弃回合制里永久保留的等级——即时交战里防御等级立刻写入公共能力阶梯，晶壳是一段可见窗口，
 *   被清除、到期或被一记重击打裂时等级一起收回。它是本族里唯一**怕爆发**的一招：细碎的攻击磨不裂它，
 *   一下够狠的就能提前结束；同时它也是唯一在窗口里直接削伤（不只是抬等级）的一招。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift     防御等级：固定 1，原生「提高防御」的对位，是这招的身份常数。
 *   temper   削伤比例：基础 18% + 防御×0.0012；深硬化 ×1.3／浅硬化 ×0.85；夹 10%..42%。
 *   crack    碎壳阈值：基础 16% + 防御×0.001；深硬化 ×1.25／浅硬化 ×0.8；夹 8%..35%。
 *   window   晶壳时长：基础 150 刻 + 等级×2 + 防御×0.4；深硬化 ×1.25／浅硬化 ×0.8；夹 110..340。
 *   facets   晶面数：基础 14 + 防御×0.1 + 等级×0.2；夹 12..40。
 *   shell    晶壳半径：基础 0.7 格 + 碰撞箱宽度×0.6；夹 0.65..1.6。
 *   tempo    起手：基础 7 刻 − 速度×0.02，深硬化 +3；夹 4..13。
 *   aftercast 收招：基础 4 刻 + 碰撞箱高度×1.0；夹 4..8。
 *   wait     冷却：基础 100 刻 − 等级×0.4，深硬化 ×1.15／浅硬化 ×0.9；夹 65..125。PP 30 的代价。
 * 配置 deep（深硬化）双向取舍：开启＝壳更厚、削伤更多、更难被打裂、持续更久，代价是起手 +3 刻、冷却更长；
 *   关闭＝浅硬化，壳薄易裂，但起手与冷却都更短。硬吃重击与频繁补壳各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("harden", {
        /** 防御等级：原生 +1，本招的身份常数。 */
        gift: formula(F.const(1), "防御等级", {
            unit: " 级",
            description: "晶壳在身时把防御抬高多少级；原生「提高防御」的对位。"
        }),
        /** 削伤比例：防御越厚磨掉越多。 */
        temper: percent(
            F.base(0.18).plus(F.stat("defence").times(0.0012))
                .times(F.when(F.pref("deep", text("worldcombat.skill.harden.preference.deep")), F.const(1.3), F.const(0.85)))
                .clamp(0.1, 0.42),
            "削伤比例", "晶壳把每一击削掉多少（按该次伤害比例）；防御越高削得越多，深硬化比浅硬化厚。"),
        /** 碎壳阈值：一击够重就打裂。 */
        crack: percent(
            F.base(0.16).plus(F.stat("defence").times(0.001))
                .times(F.when(F.pref("deep", text("worldcombat.skill.harden.preference.deep")), F.const(1.25), F.const(0.8)))
                .clamp(0.08, 0.35),
            "碎壳阈值", "单次攻击达到最大生命的这个比例就把晶壳一次打裂；防御越高越难裂，深硬化更高。"),
        /** 晶壳时长：等级与防御决定壳能撑多久。 */
        window: seconds(
            F.base(150).plus(F.level().times(2)).plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.harden.preference.deep")), F.const(1.25), F.const(0.8)))
                .clamp(110, 340).round(0),
            "晶壳时长", "晶壳在身上撑多久；等级与防御越高越久，深硬化更久。裂开或到期时这段防护抬起的等级一起收回。"),
        /** 晶面数：防御与等级越高晶面越多。 */
        facets: formula(
            F.base(14).plus(F.stat("defence").times(0.1)).plus(F.level().times(0.2)).clamp(12, 40).round(0),
            "晶面数", {
                unit: " 面",
                description: "拼成这层晶壳的棱面数量；防御与等级越高越多，粒子按它发射。"
            }),
        /** 晶壳半径：体型越宽包得越开。 */
        shell: formula(
            F.base(0.7).plus(F.body("width").times(0.6)).clamp(0.65, 1.6).round(2),
            "晶壳半径", {
                unit: " 格",
                description: "晶壳包住身体的半径；碰撞箱越宽包得越开，表现里的晶环就是这个半径。"
            }),
        /** 起手：速度决定结晶多快，深硬化更慢。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.harden.preference.deep")), F.const(3), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "表面结晶、壳合上需要多久；速度越快越短，深硬化更慢（也更容易被打断）。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.0)).clamp(4, 8).round(0),
            "收招", "结晶之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，深硬化更长。 */
        wait: seconds(
            F.base(100).minus(F.level().times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.harden.preference.deep")), F.const(1.15), F.const(0.9)))
                .clamp(65, 125).round(0),
            "冷却", "两次变硬之间的等待；等级越高越短，深硬化更长。PP 30 的代价。")
    });

    stages("harden", [
        { level: 25, values: { window: 180, wait: 88 } },
        { level: 45, values: { window: 220, wait: 78 } }
    ]);

    describe("harden", [
        { key: "description.0", values: ["gift", "temper", "window"] },
        { key: "description.1", values: ["crack", "facets", "shell"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
