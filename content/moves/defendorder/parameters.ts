/**
 * 防御指令 / defendorder — 参数与数值来源。
 *
 * 原生事实：Bug、变化、威力 —、命中必中、PP 10、目标 self、boosts { def: +1, spd: +1 }（仅蜂女王 1 位学习者）。
 * 原生描述：「召唤手下，让其附在自己的身体上，可以提高自己的防御和特防。」
 *
 * 翻译：把「召唤手下附在自己身上」原样落成**一队会飞的手下扑上来贴住身体、叠成一层会动的甲壳**——每贴一只，
 *   防御与特防各 +1；被清掉一只，甲壳就薄一分。取原生「防御 +1、特防 +1、PP 10、纯自我防护」；放弃回合制里
 *   永久保留的等级 → 即时交战里等级随活着的甲虫增减，甲壳是一层**活的、会被打掉的防护**。它在本组里是唯一
 *   由活物承载收益的一招：别的招的收益写在身上，这招的收益在手下身上，对手可以先清手下再打你。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   brood    手下面数：基础 2 + 等级/30（夹 0..1），虫海档 +2；夹 2..5。等级越高、档位越厚，贴上的甲虫越多，也是本招能抬到的等级上限。
 *   carapace 每只等级：固定 1（原生 +1，本招的身份常数）。
 *   bond     附身时长：基础 180 刻 + 等级×2 + 特防×0.4；夹 140..380。等级与特防越高，甲壳撑得越久。
 *   ring     环列半径：基础 0.8 格 + 碰撞箱宽度×0.6；夹 0.7..1.6。体型越宽，手下贴得越开（判定与表现同径）。
 *   chitin   单只生命：虫海 3 点／精锐 6 点。被清掉的手下不再供给它那一级。
 *   guards   甲壳微粒量：基础 14 +（防御 + 特防）/16；夹 14..60。两防越高，一次召来的甲壳微粒越多，粒子按它发射。
 *   tempo    起手：基础 12 刻 − 速度×0.03；夹 7..16。振翅下令、把手下召到身边的时间。
 *   aftercast 收招：基础 6 刻 + 碰撞箱高度×1.0；夹 6..11。
 *   wait     冷却：基础 120 刻 − 等级×0.4；夹 80..150。PP 10 的代价。
 * 配置 swarm（虫海）双向取舍：开启＝手下面数 +2、收益上限更高，但每只生命 3、被一口气清掉的风险大；关闭＝精锐手下，
 *   每只生命 6、甲壳更稳，代价是面数更少、上限更低。想要高上限还是稳定，各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("defendorder", {
        /** 手下面数：也是本招能抬到的等级上限。 */
        brood: formula(
            F.base(2).plus(F.level().div(30).clamp(0, 1)).plus(F.when(F.pref("swarm", text("worldcombat.skill.defendorder.preference.swarm")), F.const(2), F.const(0)))
                .clamp(2, 5).round(0),
            "手下面数", {
                unit: " 只",
                description: "召唤并贴到身上的手下数量；等级越高越多，虫海档再加两只。每只活着时给防御与特防各 +1，所以它也是本招的收益上限。"
            }),
        /** 每只等级：原生 +1，本招的身份常数。 */
        carapace: formula(F.const(1), "每只等级", {
            unit: " 级",
            description: "每只活着的手下把防御与特防各抬高多少级；原生 +1。"
        }),
        /** 附身时长：特防决定甲壳撑多久，等级由成长阶梯拉长。 */
        bond: seconds(
            F.base(180).plus(F.stat("specialDefence").times(0.4)).clamp(140, 380).round(0),
            "附身时长", "手下在身上的时间；特防越高越久，等级在同级台阶上再拉长。时间到、或手下被清光，甲壳就散。"),
        /** 环列半径：体型越宽贴得越开。 */
        ring: formula(
            F.base(0.8).plus(F.body("width").times(0.6)).clamp(0.7, 1.6).round(2),
            "环列半径", {
                unit: " 格",
                description: "手下贴住身体的半径；碰撞箱越宽贴得越开，表现里的甲壳范围就是这个半径。"
            }),
        /** 单只生命：档位决定单只多耐打。 */
        chitin: formula(
            F.when(F.pref("swarm", text("worldcombat.skill.defendorder.preference.swarm")), F.const(3), F.const(6)).round(0),
            "单只生命", {
                unit: " 点",
                description: "每只手下的生命；被清掉的手下不再供给它那一级。虫海档更脆、精锐档更稳。"
            }),
        /** 甲壳微粒量：两防越高越多。 */
        guards: formula(
            F.base(14).plus(F.stat("defence").plus(F.stat("specialDefence")).div(16)).clamp(14, 60).round(0),
            "甲壳微粒量", {
                unit: " 点",
                description: "一次召来的甲壳微粒数量；防御与特防越高越多，粒子按它发射。"
            }),
        /** 起手：速度决定召手下多快。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.03)).clamp(7, 16).round(0),
            "起手", "振翅下令、把手下召到身边需要多久；速度越快越短。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.0)).clamp(6, 11).round(0),
            "收招", "下令之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级由成长阶梯缩短。 */
        wait: seconds(
            F.base(120).clamp(80, 150).round(0),
            "冷却", "再召一队手下前的等待；等级越高越短。PP 10 的代价。")
    });

    stages("defendorder", [
        { level: 40, values: { bond: 260, wait: 104 } },
        { level: 60, values: { bond: 300, wait: 96 } }
    ]);

    describe("defendorder", [
        { key: "description.0", values: ["brood", "carapace"] },
        { key: "description.1", values: ["bond", "ring", "chitin"] },
        { key: "description.additional", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "swarm.on", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) === true; } },
        { key: "swarm.off", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bond", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bond", "tier.1.wait"] }
    ]);
}
