/**
 * 盘蜷 / coil 的参数与数值来源。
 *
 * 原生事实：Poison／变化／威力 0／命中必中／PP 20／目标 self／boosts { atk: +1, def: +1, accuracy: +1 }。
 *   19 个已实装学习者。
 *
 * 翻译：把「盘蜷着集中精神」翻成一段**慢而完整的架势**——施术者把身体一圈圈盘紧，能量环从外向里收拢，
 *   收到底后猛地一撑，攻击、防御与命中率一起抬起来。它是本族里唯一同时抬三项的一支，也是窗口最长的一支：
 *   起手慢、冷却长，换来一段真正站得住的稳固期，并且把命中率也一并拉正。取原生「攻/防/命中各 +1、必中、
 *   纯自我强化」；放弃回合制里永久保留的等级——即时交战里「盘势」以可见窗口存在，窗口走完一并收回。
 *
 * 数值来源（每个参数读不同的精灵数据／现场事实，分散到不同参数上）：
 *   rise      物攻增益：原生 1 级，固定，是这招的身份而不是成长点。
 *   guard     防御增益：原生 1 级；配置「盘紧」多 1 级（夹 1..2）。
 *   focus     命中增益：原生 1 级；等级每比 30 高 50 再多 1 级（夹 1..2）——练得越熟，盘定后瞄得越稳。
 *   brace     盘势窗口：基础 240 刻 ＋ 等级 ×3 ＋（防御＋特防）/5，夹 200..520；盘紧 ×1.25、松盘 ×0.85。
 *   coils     盘绕圈数（同时是环与粒子的数量）：防御与等级派生，夹 10..36。
 *   ring      盘绕半径：体宽决定，夹 0.8..1.8，也是指示圈与表现共用的半径。
 *   tempo     起手：速度每比 60 快 1 减 0.02 刻，夹 6..14；盘紧 +4（收得更紧更慢）。
 *   aftercast 收招：基础 6 刻 ＋ 碰撞箱高度，夹 6..10。
 *   wait      冷却：基础 95 刻 − 等级 ×0.6，夹 60..120；盘紧 +15。PP 20 的代价。
 * 配置 tight（盘紧）双向取舍：开启＝防御多抬 1 级、盘势窗口 ×1.25，但起手 +4 刻、冷却 +15、盘绕更慢；
 *   关闭＝松盘，出手快、冷却短、收招利落，只是防御只 +1。两向各有适用局面：要硬顶一轮时盘紧，要快速起身时松盘。
 */
namespace PokemonSkills {
    actionParameters.define("coil", {
        /** 物攻增益：原生 +1，本招的身份常数。 */
        rise: formula(F.const(1), "物攻增益", {
            unit: " 级",
            description: "盘定后把物攻抬高多少级；原生「提高攻击」的对位。"
        }),
        /** 防御增益：原生 +1，盘紧再多 1 级。 */
        guard: formula(
            F.base(1).plus(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(1), F.const(0))).clamp(1, 2),
            "防御增益", {
                unit: " 级",
                description: "盘定后把防御抬高多少级；原生「提高防御」的对位，盘紧再多一级。"
            }),
        /** 命中增益：练得越熟盘得越稳。 */
        focus: formula(
            F.base(1).plus(F.level().minus(30).times(0.02).clamp(0, 1)).round(0).clamp(1, 2),
            "命中增益", {
                unit: " 级",
                description: "盘定后把命中能力等级抬高多少级；等级每比 30 高 50 再多一级。对宝可梦落到原生命中等级。"
            }),
        /** 盘势窗口：三项留在身上的时长，本族最长。 */
        brace: seconds(
            F.base(240).plus(F.level().times(3)).plus(F.stat("defence").plus(F.stat("specialDefence")).div(5))
                .times(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(1.25), F.const(0.85)))
                .clamp(200, 520).round(0),
            "盘势窗口", "「盘势」在身上的时长；等级与双防越高撑得越久，盘紧再 ×1.25。窗口走完，这次抬起的三项一并收回。"),
        /** 盘绕圈数：防御与等级派生，直接驱动画面里的环数。 */
        coils: formula(
            F.base(12).plus(F.stat("defence").div(6)).plus(F.level().div(4)).clamp(10, 36).round(0),
            "盘绕圈数", {
                unit: " 圈",
                description: "身体盘成几圈（也是画面里收紧的环与粒子总数）；防御与等级越高盘得越厚。"
            }),
        /** 盘绕半径：体宽决定。 */
        ring: formula(
            F.base(0.9).plus(F.body("width").times(0.4)).clamp(0.8, 1.8).round(2),
            "盘绕半径", {
                unit: " 格",
                description: "盘势在身外撑开的半径；体宽越大盘得越开。它也是指示圈与表现共用的半径。"
            }),
        /** 起手：速度决定盘多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02))
                .plus(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(4), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把身体一圈圈盘紧需要多久；速度越高越快，盘紧多花 4 刻。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height")).clamp(6, 10).round(0),
            "收招", "撑定收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(95).minus(F.level().times(0.6))
                .plus(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(15), F.const(0)))
                .clamp(60, 120).round(0),
            "冷却", "两次盘蜷之间的等待；等级越高越短，盘紧更长。PP 20 的代价。")
    });

    stages("coil", [
        { level: 40, values: { brace: 300, wait: 86 } },
        { level: 55, values: { brace: 360, wait: 78 } }
    ]);

    describe("coil", [
        { key: "description.0", values: ["rise", "guard", "focus", "coils"] },
        { key: "description.1", values: ["brace", "ring"] },
        { key: "tight.on", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "tight.off", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.brace"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.brace"] }
    ]);
}
