/**
 * 吹捧 / flatter 的参数与数值来源。
 *
 * 原生事实：Dark、Status、威力 —、命中 100、PP 15、目标 normal（单体）／volatile confusion／boosts={spa:+1}。
 * 世界化：这是当面把对手捧得找不着北——它的**特攻被抬高**、脚步却被甜言蜜语钉住一下，
 * 同时挂上共享身份 world_combat:status/confusion 的真实 MobEffect：它每次想出手都可能走神作废，
 * 打中敌人时还会被自己的得意反噬，特攻越高反噬越重。命中 100 直译为没有瞄准偏差，混乱能否挂上由共享策略裁决。
 * 对宝可梦，特攻礼物走 NativeEffects.boost 改原生等级；对其他战斗者落到攻击属性，一条路径覆盖所有对象。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   chance   施法者速度每比 60 多 1 点，失手几率 +0.0015；连珠吹捧 +0.12；夹在 16%..50%。速度＝话说得多快多密。
 *   duration 基础 150 刻；等级 20 起每级 +1.2；特攻每比 60 多 1 点 +0.4；连珠 ×0.7／缓缓 ×1.35。
 *   gift     给目标的特攻等级：基础 1，连珠 +1，等级 48 起 +1；夹在 1..3 级。
 *   pin      定身时长：基础 8 刻，速度每比 60 快 1 加 0.2，夹 8..20 刻——快嘴绕得对手更久站不稳。
 *   recoil   反噬基数：按最大生命比例；连珠 ×1.3／缓缓 ×0.7。实际值再按目标当前特攻放大。
 * 配置 tone 双向取舍：连珠吹捧让礼物更重、失手更易、定身更久，但怒火更短、反噬更重；缓缓称颂相反。
 */
namespace PokemonSkills {
    /** 每次命中的反噬基数（最大生命比例），skill.ts 的结算读这里，保证与公式同源。 */
    export const flatterRecoilFraction = 0.045;

    actionParameters.define("flatter", {
        /** 失手几率：基础 0.24，速度每比 60 多 0.0015，连珠 +0.12，夹在 0.16..0.50。 */
        chance: percent(
            F.base(0.24)
                .plus(F.stat("speed").minus(60).max(0).times(0.0015))
                .plus(F.when(F.pref("tone", text("worldcombat.skill.flatter.preference.tone")), F.const(0.12), F.const(0)))
                .clamp(0.16, 0.50),
            "失手几率", "被吹捧后每次出手走神作废、并被得意反噬的概率；施法者速度越快，话越密，对手越晕。"),
        /** 怒火持续：基础 150 刻；等级 20 起每级 +1.2；特攻每多 1 点 +0.4；连珠 ×0.7／缓缓 ×1.35；夹 110..340。 */
        duration: seconds(
            F.base(150)
                .plus(F.level().minus(20).max(0).times(1.2))
                .plus(F.stat("specialAttack").minus(60).max(0).times(0.4))
                .times(F.when(F.pref("tone", text("worldcombat.skill.flatter.preference.tone")), F.const(0.7), F.const(1.35)))
                .clamp(110, 340).round(0),
            "陶醉持续", "目标陷入混乱的时长；等级与施法者魅力让它持续更久，连珠吹捧换来更短的陶醉。"),
        /** 特攻礼物：基础 1 级，连珠 +1，等级 48 起 +1，夹 1..3。 */
        gift: formula(
            F.base(1)
                .plus(F.when(F.pref("tone", text("worldcombat.skill.flatter.preference.tone")), F.const(1), F.const(0)))
                .plus(F.when(F.level().gte(48), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "特攻礼物", {
                unit: " 级",
                description: "送给目标的特攻等级；等级 48 起再 +1 级。它的法术更疼，反噬也更重。"
            }),
        /** 定身：基础 8 刻，速度每比 60 快 1 加 0.2，夹 8..20。 */
        pin: seconds(
            F.base(8).plus(F.stat("speed").minus(60).max(0).times(0.2)).clamp(8, 20).round(0),
            "定身时长", "目标被甜言蜜语钉在原地的时长；话快的个体绕得它更久。"),
        /** 反噬比例：连珠 ×1.3／缓缓 ×0.7，夹 0.025..0.08。实际再按目标特攻/100（0.4..2.5）放大。 */
        recoil: percent(
            F.base(flatterRecoilFraction)
                .times(F.when(F.pref("tone", text("worldcombat.skill.flatter.preference.tone")), F.const(1.3), F.const(0.7)))
                .clamp(0.025, 0.08),
            "反噬比例", "被吹捧者打中时的自伤基数（按最大生命）；实际值再按其当前特攻放大，越得意摔得越狠。"),
        /** 起手：速度每比 60 快 1 少 0.03 刻，夹 5..11。 */
        telegraph: seconds(
            F.base(9).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(5, 11).round(0),
            "起手", "开口吹捧需要多久；话快的个体更早开口。"),
        /** 收招：基础 7 刻，碰撞箱高度每比 1.4 高 1 格 +1.5，夹 5..12。 */
        aftermath: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(1.5)).clamp(5, 12).round(0),
            "收招", "吹捧之后的收势；身板越大越慢。"),
        /** 冷却：基础 140 刻，等级 20 起每级 -0.5，夹 90..150。 */
        wait: seconds(
            F.base(140).minus(F.level().minus(20).max(0).times(0.5)).clamp(90, 150).round(0),
            "冷却", "两次吹捧之间的等待；等级越高越熟练。")
    });

    describe("flatter", [
        { key: "description.0", values: ["gift", "pin", "duration"] },
        { key: "description.1", values: ["chance", "recoil"] },
        { key: "description.2", values: ["telegraph", "aftermath", "wait", "range"] }
    ]);
}
