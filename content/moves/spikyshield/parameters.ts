/**
 * 尖刺防守 / spikyshield 的参数。
 *
 * 原生事实：Grass、Status、自身、优先度 +4、PP 10；防住对手攻击的同时削减接触到自己的对手的体力
 * （Cobblemon 1.8 数据）。
 *
 * 翻译：把“防住攻击 + 接触掉血”翻成一件**在身前炸开的藤刺甲**——它像守住一样按总量挡下每一击，
 * 而每一次直接的接触会让攻击者被刺进一根刺，立刻按施法者的尖刺锐度掉一段体力（走共享伤害结算，
 * 因此对手的防御、相性与暴击都参与，草的个体打草属性的接触者更疼）。
 *
 * 与家族分开：同族里王者盾牌削的是攻击、碉堡灌的是毒、线阱黏的是速度，只有尖刺防守**当场掉血**；
 * 与拦堵（接触降防）相比，藤刺甲把代价直接结算在体力上。
 *
 * 数值分散到多类精灵数据（每项读不同的量）：
 *   raise      立甲快慢：体重（重身板顶得慢）。
 *   window     藤甲持续时间：防御（越硬撑得越久）、配置取向。
 *   capacity   藤甲能完整挡下的总量：当前生命 + 防御（残血更薄、肉盾更厚）、配置取向。
 *   spike      每根刺的伤害威力：防御 + 等级（刺的硬度随个体成长），走共享换算；对手防御/相性/暴击命中时另算。
 *   radius     藤刺炸开的半径：碰撞箱高度（身板越大圈越宽）。
 *   charge     冷却：等级。
 *   fizzle     连用失误率：本招自己的连用计数 + 等级（兑现“连续使出容易失败”）。
 *
 * 配置 `thorn`（锐刺／厚藤）双向取舍：开＝刺伤害 ×1.25，但总量 ×0.8、持续 ×0.85、收招 5 刻；
 * 关＝总量 ×1.25、持续 ×1.15，但刺伤害 ×0.8、收招 8 刻。两向各有局面（惩罚近战 vs 硬吃齐射）。
 */
namespace PokemonSkills {
    actionParameters.define("spikyshield", {
        /** 立起时间：基础 8 刻 + 体重 ×0.002，夹在 6..16。 */
        raise: formula(
            F.base(8).plus(F.body("weight").times(0.002)).clamp(6, 16).round(0),
            "立起时间", {
                unit: "刻",
                description: "从起手到藤刺甲炸开的时间；重身板顶得慢。"
            }),
        /** 藤甲持续：基础 26 刻，防御每比 60 高 1 +0.12 刻；锐刺 ×0.85、厚藤 ×1.15，夹在 14..52。 */
        window: formula(
            F.base(26).plus(F.stat("defence").minus(60).max(0).times(0.12))
                .times(F.when(F.pref("thorn"), F.const(0.85), F.const(1.15)))
                .clamp(14, 52).round(0),
            "藤甲持续", {
                unit: "刻",
                description: "藤刺甲从炸开到收拢的时间；防御越高撑得越久，锐刺取向更短。"
            }),
        /** 藤甲总量：基础 16 点，当前生命 ×0.22、防御 ×0.32；锐刺 ×0.8、厚藤 ×1.25，夹在 10..120。 */
        capacity: formula(
            F.base(16)
                .plus(F.actor("health").times(0.22))
                .plus(F.stat("defence").times(0.32))
                .times(F.when(F.pref("thorn"), F.const(0.8), F.const(1.25)))
                .clamp(10, 120).round(1),
            "藤甲总量", {
                unit: "点",
                description: "藤刺甲能完整挡下的伤害总量；残血时更薄，肉盾的甲更耐打。"
            }),
        /** 刺伤威力：基础 5 + 防御 ×0.12 + 等级 ×0.25；锐刺 ×1.25、厚藤 ×0.8，夹在 4..40。 */
        spike: formula(
            F.base(5)
                .plus(F.stat("defence").times(0.12))
                .plus(F.level().times(0.25))
                .times(F.when(F.pref("thorn"), F.const(1.25), F.const(0.8)))
                .clamp(4, 40).round(1),
            "刺伤威力", {
                unit: "威力",
                description: "每次接触扎进攻击者的刺的威力；防御越硬、等级越高扎得越深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 藤刺半径：基础 1.6 格 + 碰撞箱高度 ×0.5，夹在 1.5..3.2。 */
        radius: formula(
            F.base(1.6).plus(F.body("height").times(0.5)).clamp(1.5, 3.2).round(2),
            "藤刺半径", {
                unit: "格",
                description: "绕自身一圈炸开的藤刺半径；身板越大圈越宽，画面与判定同半径。"
            }),
        /** 冷却：基础 80 刻 + 等级 ×0.5，夹在 80..130。 */
        charge: formula(
            F.base(80).plus(F.level().times(0.5)).clamp(80, 130).round(0),
            "冷却", {
                unit: "刻",
                description: "再次炸开藤刺甲前的等待；等级越高成本越大。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出容易失败”：短时间内反复架藤甲会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240)
    });

    defineDamage("spikyshield", "spike",
        { rationale: "藤刺扎入的一记穿刺，物理类别、Grass 属性，走共享防御/相性/暴击结算。" }, {});
    defineCategory("spikyshield", "physical");

    describe("spikyshield", [
        { key: "description.0", values: ["window","capacity"] },
        { key: "description.ward", values: [] },
        { key: "description.thorn", values: ["spike"] },
        { key: "description.pool", values: [] },
        { key: "description.1", values: ["raise","charge"] },
        { key: "description.2", values: ["fizzle"] }
    ]);
}
