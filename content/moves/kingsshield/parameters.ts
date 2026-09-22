/**
 * 王者盾牌 / kingsshield 的参数。
 *
 * 原生事实：Steel、Status、自身、优先度 +4、PP 10、isNonstandard: Past；防住对手攻击（变化招式不受阻）的同时，
 * 自己摆出防御姿态，并降低接触到自己的对手的攻击（Cobblemon 1.8 数据）。
 *
 * 翻译：把“钢之威仪”翻成一面**立在身前的纹章钢盾**——它像守住一样按总量挡下伤害招式，而每一次接触
 * 让攻击者的攻击锐度被盾沿削掉（走共享能力等级，对宝可梦改原生等级、对原版生物落到攻击属性上）。
 * 变化招式不进 pool 的拦截，所以**会照常落在身上**，这是它与尖刺防守／碉堡的取舍点。
 *
 * 与家族分开：同族里尖刺防守当场掉血、碉堡灌毒、线阱黏速度，只有王者盾牌**削攻击**，是最纯粹的一记“请君失手”。
 *
 * 数值分散到多类精灵数据（每项读不同的量）：
 *   raise      立盾快慢：体重。
 *   window     钢盾持续：防御 + 速度（越稳、越敏捷，架势越难被压垮）、配置取向。
 *   capacity   钢盾能完整挡下的总量：当前生命 + 特防（最厚的一档，代价是只挡伤害招）。
 *   drop       接触削攻级数：等级（门槛 40 级 +1）、配置取向。
 *   radius     盾影半径：碰撞箱高度。
 *   charge     冷却：等级。
 *   fizzle     连用失误率：本招自己的连用计数 + 等级。
 *
 * 配置 `majesty`（威仪／磐固）双向取舍：开＝削攻 +1 级，但总量 ×0.8、持续 ×0.85；
 * 关＝总量 ×1.25、持续 ×1.15，但削攻不额外加。两向各有局面（压制近战 vs 硬挡齐射）。
 */
namespace PokemonSkills {
    actionParameters.define("kingsshield", {
        /** 立起时间：基础 8 刻 + 体重 ×0.002，夹在 6..16。 */
        raise: formula(
            F.base(8).plus(F.body("weight").times(0.002)).clamp(6, 16).round(0),
            "立起时间", {
                unit: "刻",
                description: "从起手到钢盾立稳的时间；重身板顶得慢。"
            }),
        /** 钢盾持续：基础 22 刻，防御每比 60 高 1 +0.10、速度每比 60 高 1 +0.08；威仪 ×0.85、磐固 ×1.15，夹在 12..44。 */
        window: formula(
            F.base(22)
                .plus(F.stat("defence").minus(60).max(0).times(0.10))
                .plus(F.stat("speed").minus(60).max(0).times(0.08))
                .times(F.when(F.pref("majesty"), F.const(0.85), F.const(1.15)))
                .clamp(12, 44).round(0),
            "钢盾持续", {
                unit: "刻",
                description: "钢盾从立稳到散去的时间；防御与速度越高架势越稳，威仪取向更短。"
            }),
        /** 钢盾总量：基础 18 点，当前生命 ×0.25、特防 ×0.30；威仪 ×0.8、磐固 ×1.25，夹在 12..140。 */
        capacity: formula(
            F.base(18)
                .plus(F.actor("health").times(0.25))
                .plus(F.stat("specialDefence").times(0.30))
                .times(F.when(F.pref("majesty"), F.const(0.8), F.const(1.25)))
                .clamp(12, 140).round(1),
            "钢盾总量", {
                unit: "点",
                description: "钢盾能完整挡下的伤害总量；残血更薄，特防高的个体更厚。"
            }),
        /** 接触削攻：基础 1 级，40 级起 +1，威仪再 +1，夹在 1..3。 */
        drop: formula(
            F.base(1)
                .plus(F.when(F.level().gte(40), F.const(1), F.const(0)))
                .plus(F.when(F.pref("majesty"), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "接触削攻", {
                unit: "级",
                description: "接触攻击撞上钢盾时，攻击者下降的攻击等级；等级越高、威仪取向削得越多。"
            }),
        /** 盾影半径：基础 1.6 格 + 碰撞箱高度 ×0.5，夹在 1.5..3.0。 */
        radius: formula(
            F.base(1.6).plus(F.body("height").times(0.5)).clamp(1.5, 3.0).round(2),
            "盾影半径", {
                unit: "格",
                description: "钢盾护住的横向半径；身板越大盾影越宽，画面与判定同半径。"
            }),
        /** 冷却：基础 75 刻 + 等级 ×0.5，夹在 75..125。 */
        charge: formula(
            F.base(75).plus(F.level().times(0.5)).clamp(75, 125).round(0),
            "冷却", {
                unit: "刻",
                description: "再次摆出钢盾前的等待；等级越高成本越大。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出容易失败”：短时间内反复摆钢盾会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240)
    });

    describe("kingsshield", [
        { key: "description.0", values: ["window", "capacity", "drop"] },
        { key: "description.1", values: ["raise", "radius", "charge"] },
        { key: "description.2", values: ["fizzle", "pref.majesty"] }
    ]);
}
