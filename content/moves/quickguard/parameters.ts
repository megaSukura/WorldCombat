/**
 * 快速防守 / quickguard 的参数与数值来源。
 *
 * 原生事实：Fighting、变化、威力 —、命中必中、PP 15、优先度 +3、目标己方场地 side quickguard，持续 1 回合，
 *   期间己方全员免疫对手的**先制招式**（priority > 0 的招式）。
 *
 * 核心念头：抢在对手的下一手之前架起一面极短的快板，替自己与身边的队友各自接住**第一记**敌方直击，
 *   有界地削掉它，随即那块板碎掉——不是按总量磨穿的护盾，而是一人一次的快拍。
 * 世界化：原生的「1 回合」翻成极短的一段窗口（抢拍 8 刻／稳架 12 刻）；提交时给施法者与半径内的友方
 *   各挂一份共享身份 world_combat:status/quickguard 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并各自领到一层共享 GuardEffects 的 pool（本单元规则 world_combat:move_quickguard）：
 *   只截敌方 DamageSemantics.directOffense（原生近战、弹丸与真实伤害招式；排残伤、环境与自费），
 *   按来伤的 60% 减免、以 capacity 为单次减免上限，命中一次即消耗该人的板。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   capacity 减免上限：基础 40 + 速度×1.2 + 等级×0.8；夹 34..360。速度决定一记快板最多削掉多少。
 *   window   架挡时长：抢拍 8 刻、稳架 12 刻。极短的一瞬，也是身份真实存在的时长。
 *   radius   遮蔽半径：基础 3 格 + 身高×0.6 + 速度×0.01；夹 2.5..7。身板大、速度高罩得越广。
 *   plates   快板数：基础 8 + 速度×0.06；夹 8..20。板数，粒子按它发射。
 *   motes    光点数量：基础 18 + 速度×0.08；夹 14..46。驱动画面密度。
 *   tempo    起手：基础 3 刻 − 速度×0.005，抢拍 −1、稳架 +1；夹 2..4。原生 +3 优先度落成最短的起手。
 *   aftercast 收招：基础 4 刻 + 身高×1.0；夹 4..9。
 *   wait     冷却：基础 130 刻 − 等级×0.5；夹 80..170。PP 15 的代价。
 * 配置 brace（架挡方式）双向取舍：抢拍＝起手 −1、冷却 ×0.85，换更短更小的板（吸收上限 ×0.75、半径 ×0.85）；
 *   稳架＝起手 +1、冷却 ×1.15，换更稳的板（吸收上限 ×1.25、半径 ×1.05）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("quickguard", {
        /** 单次减免上限：速度与等级决定一记快板最多削掉多少。 */
        capacity: formula(
            F.base(40).plus(F.stat("speed").times(1.2)).plus(F.level().times(0.8))
                .times(F.when(F.pref("brace", text("worldcombat.skill.quickguard.preference.brace")), F.const(0.75), F.const(1.25)))
                .clamp(34, 360).round(0),
            "减免上限", {
                unit: " 点",
                description: "每个人的板最多替那一记直击削掉多少；按来伤的 60% 减免，超出的部分照常命中。速度与等级越高越多，稳架 ×1.25、抢拍 ×0.75。"
            }),
        /** 架挡时长：极短的一瞬，抢拍 8 刻、稳架 12 刻。 */
        window: seconds(
            F.when(F.pref("brace", text("worldcombat.skill.quickguard.preference.brace")), F.const(8), F.const(12)).clamp(6, 16).round(0),
            "架挡时长", "每个人的板真实存在多久；抢拍 8 刻、稳架 12 刻，到时自动收起。"),
        /** 遮蔽半径：身板与速度决定罩多广。 */
        radius: formula(
            F.base(3).plus(F.body("height").times(0.6)).plus(F.stat("speed").times(0.01))
                .times(F.when(F.pref("brace", text("worldcombat.skill.quickguard.preference.brace")), F.const(0.85), F.const(1.05)))
                .clamp(2.5, 7).round(2),
            "遮蔽半径", {
                unit: " 格",
                description: "快板罩住多大一圈队友；身板越大、速度越高罩得越广，稳架再 ×1.05。"
            }),
        /** 快板数：驱动画面。 */
        plates: formula(
            F.base(8).plus(F.stat("speed").times(0.06)).clamp(8, 20).round(0),
            "快板数", {
                unit: " 块",
                description: "快板由多少块拼成；速度越高越多，粒子按它发射。"
            }),
        /** 光点数量：驱动画面密度。 */
        motes: formula(
            F.base(18).plus(F.stat("speed").times(0.08)).clamp(14, 46).round(0),
            "光点数量", {
                unit: " 点",
                description: "快板上的光点数量；速度越高越密，也驱动画面密度。"
            }),
        /** 起手：原生 +3 优先度的对位。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").times(0.005))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.quickguard.preference.brace")), F.const(-1), F.const(1)))
                .clamp(2, 4).round(0),
            "起手", "撑起快板需要多久；速度越快越短，原生 +3 优先度落成最短的起手，稳架再 +1 刻。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.0)).clamp(4, 9).round(0),
            "收招", "撤板之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(130).minus(F.level().times(0.5))
                .times(F.when(F.pref("brace", text("worldcombat.skill.quickguard.preference.brace")), F.const(0.85), F.const(1.15)))
                .clamp(80, 170).round(0),
            "冷却", "两次撑板之间的等待；等级越高越短，抢拍更短。PP 15 的代价。")
    });

    describe("quickguard", [
        { key: "description.0", values: ["capacity","window"] },
        { key: "description.1", values: ["radius"] },
        { key: "description.additional", values: [] },
        { key: "brace.snap", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === 1; } },
        { key: "brace.steady", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] }
    ]);
}
