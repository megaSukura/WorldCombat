/**
 * 虚张声势 / swagger 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 85、PP 15、目标 normal（单体）／volatile confusion／boosts={atk:+2}。
 * 世界化：这不是一次「必定生效的加攻＋混乱」，而是当面对目标喊一句最扎心的话。目标被点着：它的**攻击被抬高**，
 * 同时挂上共享身份 world_combat:status/confusion 的真实 MobEffect——它每次想出手都可能被怒火冲昏而作废，
 * 而且它真的把这股火冲着你来（仇恨被拉向施法者）。抬高的攻击就是这招的代价：它接下来打谁都很疼，反噬也随攻击放大。
 * 对宝可梦，攻击礼物走 NativeEffects.boost 改原生等级；对原版生物与其他模组生物落到攻击属性，一条路径覆盖所有对象。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   chance   施法者特攻每比 60 多 1 点，失手几率 +0.0015；尖刻挑衅 +0.12；夹在 18%..55%。特攻＝这句话有多扎心。
 *   duration 基础 140 刻；等级 20 起每级 +1.1；体重每比 4kg 多 1kg +0.3；尖刻 ×0.75／冷嘲 ×1.35。
 *   gift     给目标的攻击等级：基础 1，尖刻 +1，等级 45 起 +1；夹在 1..3 级。
 *   recoil   反噬基数：按最大生命比例；尖刻 ×1.3／冷嘲 ×0.7。实际值再按被激怒者当前攻击放大。
 *   telegraph/recover/cooldown 由 resolve 返回：起手吃速度、收招吃体型、冷却吃等级，名字不与保留键冲突。
 * 配置 goad 双向取舍：尖刻挑衅让礼物更重、失手更易，但怒火更短、反噬更重；冷嘲热讽礼物更轻，却烧得更久、反噬更轻。
 */
namespace PokemonSkills {
    /** 每次命中的反噬基数（最大生命比例），skill.ts 的结算读这里，保证与公式同源。 */
    export const swaggerRecoilFraction = 0.055;

    actionParameters.define("swagger", {
        /** 失手几率：基础 0.28，特攻每比 60 多 0.0015，尖刻 +0.12，夹在 0.18..0.55。 */
        chance: percent(
            F.base(0.28)
                .plus(F.stat("specialAttack").minus(60).max(0).times(0.0015))
                .plus(F.when(F.pref("goad", text("worldcombat.skill.swagger.preference.goad")), F.const(0.12), F.const(0)))
                .clamp(0.18, 0.55),
            "失手几率", "被激怒后每次出手挥空、并被怒火反噬的概率；施法者特攻越高，这句挑衅越扎心。"),
        /** 怒火持续：基础 140 刻；等级 20 起每级 +1.1；体重每多 1kg +0.3；尖刻 ×0.75／冷嘲 ×1.35；夹 100..340。 */
        duration: seconds(
            F.base(140)
                .plus(F.level().minus(20).max(0).times(1.1))
                .plus(F.body("weight").minus(40).max(0).times(0.3))
                .times(F.when(F.pref("goad", text("worldcombat.skill.swagger.preference.goad")), F.const(0.75), F.const(1.35)))
                .clamp(100, 340).round(0),
            "怒火持续", "目标陷入混乱的时长；等级与体量让它烧得更久，尖刻挑衅换来更短的怒火。"),
        /** 攻击礼物：基础 1 级，尖刻 +1，等级 45 起 +1，夹 1..3。 */
        gift: formula(
            F.base(1)
                .plus(F.when(F.pref("goad", text("worldcombat.skill.swagger.preference.goad")), F.const(1), F.const(0)))
                .plus(F.when(F.level().gte(45), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "攻击礼物", {
                unit: " 级",
                description: "送给目标的攻击等级；等级 45 起再 +1 级。它打你更疼，反噬也更重。"
            }),
        /** 反噬比例：尖刻 ×1.3／冷嘲 ×0.7，夹 0.03..0.09。实际再按目标攻击/100（0.4..2.5）放大。 */
        recoil: percent(
            F.base(swaggerRecoilFraction)
                .times(F.when(F.pref("goad", text("worldcombat.skill.swagger.preference.goad")), F.const(1.3), F.const(0.7)))
                .clamp(0.03, 0.09),
            "反噬比例", "被激怒者打中时的自伤基数（按最大生命）；实际值再按其当前攻击放大，越凶砸得越重。"),
        /** 起手：速度每比 60 快 1 少 0.04 刻，夹 5..11。 */
        telegraph: seconds(
            F.base(9).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(5, 11).round(0),
            "起手", "喊出这句话需要多久；出手快的个体更早把火点着。"),
        /** 收招：基础 8 刻，碰撞箱高度每比 1.4 高 1 格 +2，夹 6..14。 */
        aftermath: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(2)).clamp(6, 14).round(0),
            "收招", "挑衅之后的收势；身板越大越慢。"),
        /** 冷却：基础 150 刻，等级 20 起每级 -0.6，夹 90..160。 */
        wait: seconds(
            F.base(150).minus(F.level().minus(20).max(0).times(0.6)).clamp(90, 160).round(0),
            "冷却", "两次挑衅之间的等待；等级越高越熟练。")
    });

    describe("swagger", [
        { key: "description.0", values: ["gift","duration"] },
        { key: "description.1", values: ["chance","recoil"] },
        { key: "description.sustain", values: [] },
        { key: "description.2", values: ["telegraph", "aftermath", "wait", "range"] }
    ]);
}
