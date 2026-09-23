/**
 * 铁尾 / irontail 的参数与伤害段。
 *
 * 原生事实：Steel／物理／威力 100／命中 75／PP 15／接触（Cobblemon 1.8，323 位学习者）。
 * 次要效果：30% 让目标防御下降 1 级。
 *
 * 翻译：把“用钢一样硬的尾巴摔打对手”落成一记看得见的重砸——先转身把尾巴抡起（长预告），再沿锁定的一条线
 * 砸到目标所在的地面。命中 75 不落成掷骰，而落成这段长预告：对手在抬尾的窗口里走出落点就能躲开这一砸。
 * 它是破防四打里最重、最慢、最明显的：单下最狠、击退最远，但砸不中就什么都没有。
 *
 * 数据分散：
 *   slam         重砸威力：物攻定重心，体重定尾巴的分量。
 *   charge       抬尾时长：速度定抡起多快（慢的个体预告更久，更容易被躲）。
 *   tailReach    尾长与射程：身高定尾巴够到多远。
 *   impactRadius 落点判定半径：身高定砸出的坑面。
 *   push         击退：体重定把目标砸开多远。
 *   dentChance   砸凹几率：物攻定把护甲砸陷的把握（比碎岩低，一旦发生更明显）。
 *   dentStages   砸凹等级：基础 1 级，50 级起 2 级——钢尾一旦砸实，护甲陷得更深。
 *   dentTicks    砸凹标记时长：等级定陷口留多久。
 *
 * 伤害段 slam：尾尖砸下的那一下，contact 交给共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("irontail", {
        /** 重砸威力：基础 95，物攻每比 60 多 1 加 0.16，体重每比 300 多 1 加 0.01，夹在 60..150。 */
        slam: formula(
            F.base(95).plus(F.stat("attack").minus(60).times(0.16).clamp(-22, 34))
                .plus(F.body("weight").minus(300).times(0.01).clamp(-8, 14))
                .clamp(60, 150).round(1),
            "重砸威力", {
                unit: "威力",
                description: "尾尖砸在地上的基础威力；物攻越高、身体越沉，这一砸越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抬尾时长：基础 12 刻，速度每比 60 快 1 减 0.04 刻（慢则相反），夹在 8..20。 */
        charge: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.04)).clamp(8, 20).round(0),
            "抬尾时长", "转身把尾巴抡起来、砸下去之前的预告窗口；速度快的个体抡得更干脆，被躲开的余地更小。"),
        /** 尾长：基础 3.2 格，碰撞箱每比 1.4 高 1 格加 1.2 格，夹在 3.0..4.6。 */
        tailReach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(1.2)).clamp(3.0, 4.6).round(2),
            "尾长", {
                unit: "格",
                description: "尾巴从身上伸出去砸到的距离；身高腿长的个体甩得更远。它也是本招的实际射程来源。"
            }),
        /** 落点判定半径：基础 0.9 格，碰撞箱每比 1.4 高 1 格加 0.15，夹在 0.7..1.4。 */
        impactRadius: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.7, 1.4).round(2),
            "落点半径", {
                unit: "格",
                description: "砸击在地面上覆盖的判定半径；大个子的尾巴带着更大的砸面。走出这个圈就能躲开。"
            }),
        /** 击退：基础 1.0 格，体重每比 300 多 1 加 0.005，夹在 0.6..1.8。 */
        push: formula(
            F.base(1.0).plus(F.body("weight").minus(300).times(0.005)).clamp(0.6, 1.8).round(2),
            "击退距离", {
                unit: "格",
                description: "砸中后把目标沿背离方向推开的距离；越重的一尾推得越远。"
            }),
        /** 砸凹几率：基础 0.28，物攻每比 60 多 1 加 0.001，夹在 0.18..0.40。 */
        dentChance: percent(
            F.base(0.28).plus(F.stat("attack").minus(60).times(0.001)).clamp(0.18, 0.40),
            "砸凹几率", "这一砸把目标护甲砸陷、防御下降的几率；比碎岩低，但一次陷得更深。"),
        /** 砸凹等级：基础 1 级，50 级起抬到 2 级。 */
        dentStages: formula(
            F.base(1),
            "砸凹等级", {
                unit: "级",
                description: "砸凹让目标防御下降的能力等级；钢铁重砸一旦砸实，护甲陷得更深。"
            }),
        /** 砸凹标记时长：基础 100 刻，等级每比 35 高 1 加 1.2 刻，夹在 80..240。 */
        dentTicks: seconds(
            F.base(100).plus(F.level().minus(35).times(1.2)).clamp(80, 240).round(0),
            "砸凹标记时长", "目标身上砸凹标记停留的时长；等级越高陷口留得越久。")
    });

    defineDamage("irontail", "slam", {}, { contact: true });

    stages("irontail", [
        { level: 34, values: { slam: 106 } },
        { level: 50, values: { dentStages: 2 } },
        { level: 64, values: { slam: 122 } }
    ]);

    describe("irontail", [
        { key: "description.0", values: ["slam","push"] },
        { key: "description.1", values: ["tailReach", "impactRadius"] },
        { key: "description.2", values: ["dentChance","dentStages","dentTicks"] },
        { key: "description.3", values: ["charge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dentStages"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.slam"] }
    ]);
}
