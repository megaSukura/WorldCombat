/**
 * 线阱 / silktrap 的参数。
 *
 * 原生事实：Bug、Status、自身、优先度 +4、PP 10；用丝设置陷阱，防住对手攻击（变化招式不受阻）的同时，
 * 降低接触到自己的对手的速度（Cobblemon 1.8 数据）。
 *
 * 翻译：把“丝 + 陷阱”翻成一张**贴地绷起的丝网**——它按总量挡下伤害招式，而第一记直接的接触
 * 让攻击者的脚被残丝缠住、速度被压下去（共享能力等级），余网随即被一记抽干、自己脱网。
 * 变化招式不进 pool 的拦截，所以**会照常落在身上**，这是它与尖刺防守／碉堡的取舍。
 *
 * 与家族分开：同族里尖刺防守当场掉血、王者盾牌削攻击、碉堡灌毒，只有线阱**一次防住换一次脱身**——
 * 它把“先收网才能走”做成节奏，而不是又一段万能禁锢。
 *
 * 数值分散到多类精灵数据（每项读不同的量）：
 *   raise      绷网快慢：体重。
 *   window     丝网持续：速度 + 防御、配置取向。
 *   capacity   丝网能完整挡下的总量：当前生命 + 速度、配置取向。
 *   drop       接触降速级数：等级（门槛 40 级 +1）、配置取向。
 *   radius     丝网半径：碰撞箱高度。
 *   charge     冷却：等级。
 *   fizzle     连用失误率：本招自己的连用计数 + 等级。
 *
 * 配置 `snare`（缠缚／滑丝）双向取舍：开＝接触降速 +1 级，但总量 ×0.8、持续 ×0.85、收招 7 刻；
 * 关＝总量 ×1.25、持续 ×1.15、收招 5 刻，但降速不额外加。两向各有局面（钉住近战 vs 硬挡齐射）。
 */
namespace PokemonSkills {
    actionParameters.define("silktrap", {
        /** 绷网时间：基础 8 刻 + 体重 ×0.002，夹在 6..16。 */
        raise: formula(
            F.base(8).plus(F.body("weight").times(0.002)).clamp(6, 16).round(0),
            "绷网时间", {
                unit: "刻",
                description: "从起手到丝网绷紧的时间；重身板铺得慢。"
            }),
        /** 丝网持续：基础 24 刻，速度每比 60 高 1 +0.12、防御每比 60 高 1 +0.06；缠缚 ×0.85、滑丝 ×1.15，夹在 12..48。 */
        window: formula(
            F.base(24)
                .plus(F.stat("speed").minus(60).max(0).times(0.12))
                .plus(F.stat("defence").minus(60).max(0).times(0.06))
                .times(F.when(F.pref("snare"), F.const(0.85), F.const(1.15)))
                .clamp(12, 48).round(0),
            "丝网持续", {
                unit: "刻",
                description: "丝网从绷紧到松开的时间；速度与防御越高撑得越久，缠缚取向更短。"
            }),
        /** 丝网总量：基础 15 点，当前生命 ×0.20、速度 ×0.22；缠缚 ×0.8、滑丝 ×1.25，夹在 8..110。 */
        capacity: formula(
            F.base(15)
                .plus(F.actor("health").times(0.20))
                .plus(F.stat("speed").times(0.22))
                .times(F.when(F.pref("snare"), F.const(0.8), F.const(1.25)))
                .clamp(8, 110).round(1),
            "丝网总量", {
                unit: "点",
                description: "丝网能完整挡下的伤害总量；残血更薄，腿快的个体丝更韧。"
            }),
        /** 接触降速：基础 1 级，40 级起 +1，缠缚再 +1，夹在 1..3。 */
        drop: formula(
            F.base(1)
                .plus(F.when(F.level().gte(40), F.const(1), F.const(0)))
                .plus(F.when(F.pref("snare"), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "接触降速", {
                unit: "级",
                description: "第一记接触攻击撞上丝网时，攻击者下降的速度等级；等级越高、缠缚取向降得越多。"
            }),
        /** 丝网半径：基础 1.6 格 + 碰撞箱高度 ×0.5，夹在 1.5..3.2。 */
        radius: formula(
            F.base(1.6).plus(F.body("height").times(0.5)).clamp(1.5, 3.2).round(2),
            "丝网半径", {
                unit: "格",
                description: "绕自身一圈铺开的丝网半径；身板越大网越宽，画面与判定同半径。"
            }),
        /** 冷却：基础 80 刻 + 等级 ×0.5，夹在 80..130。 */
        charge: formula(
            F.base(80).plus(F.level().times(0.5)).clamp(80, 130).round(0),
            "冷却", {
                unit: "刻",
                description: "再次铺网前的等待；等级越高成本越大。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出容易失败”：短时间内反复铺网会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240)
    });

    describe("silktrap", [
        { key: "description.0", values: ["window","capacity","drop"] },
        { key: "description.escape", values: [] },
        { key: "description.pass", values: [] },
        { key: "description.1", values: ["raise","charge"] },
        { key: "description.2", values: ["fizzle","pref.snare"] }
    ]);
}
