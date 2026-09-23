/**
 * 毒千针 / barbbarrage 的参数与伤害段。
 *
 * 原生事实：Poison、物理、威力 60、命中 100、PP 10、非接触；50% 使目标中毒；目标已中毒／剧毒时威力翻倍（Cobblemon 1.8）。
 * 翻译：把“无数的毒针”当真——这一招的身份是**数量**。齐射的针数随**等级与速度**长，扇形张角随**碰撞箱高度**，
 * 单针飞行速度随**速度**，中毒概率随**攻击**（毒尖扎得越深越容易留下毒），毒性与冲退交给**等级与体重**。
 * 目标已中毒时整轮翻倍。配置 hail（倾泻）：针更多、中毒更易，但整轮威力更低、收招与冷却更长。
 *
 * 伤害段名 volley：整轮齐射随精灵数据变化的那部分（单针按针数均分）。
 */
namespace PokemonSkills {
    actionParameters.define("barbbarrage", {
        /** 齐射总威力：目标中毒／剧毒时 ×2；倾泻 ×0.85；夹在 40..140。 */
        volley: formula(
            F.base(60)
                .times(F.when(F.target("status.poison"), F.const(2), F.const(1)).as({ key: "worldcombat.skill.barbbarrage.value.react", fallback: "毒性反应" }))
                .times(F.when(F.pref("hail"), F.const(0.85), F.const(1)))
                .clamp(40, 140).round(1),
            "齐射总威力", {
                unit: "威力",
                description: "整轮毒针合计的基础威力，命中时按针数均分到每一针；目标已中毒时翻倍。对手防御、相性与暴击逐针结算。"
            }),
        /** 毒针数量：基础 3，每 25 级 +1，速度每比 50 多 1 加 0.02；倾泻 ×1.4；夹在 3..10 的整数。 */
        barbs: formula(
            F.base(3).plus(F.level().div(25)).plus(F.stat("speed").minus(50).max(0).times(0.02))
                .times(F.when(F.pref("hail"), F.const(1.4), F.const(1)))
                .clamp(3, 10).round(0),
            "毒针数量", {
                unit: "根",
                description: "一轮齐射发出的针数；等级越高、越快针越多，倾泻取向下最多。"
            }),
        /** 扇形张角：基础 9 度，高度每比 1.4 高 1 格加 5 度，夹在 4..22。 */
        spread: formula(
            F.base(9).plus(F.body("height").minus(1.4).times(5)).clamp(4, 22).round(0),
            "扇形张角", {
                unit: "度",
                description: "针雨摊开的半角；大个子抖出的面更宽，也更容易覆盖移动中的目标。"
            }),
        /** 单针飞行速度：基础 2.1 格/刻，速度每比 40 多 1 加 0.005，夹在 1.4..3.0。 */
        barbSpeed: formula(
            F.base(2.1).plus(F.stat("speed").minus(40).max(0).times(0.005)).clamp(1.4, 3.0).round(2),
            "单针速度", {
                unit: "格/刻",
                description: "毒针飞行的速度；快个体喷得更急。"
            }),
        /** 单针判定半径：基础 0.16 格，高度每比 1.4 高 1 格加 0.08，夹在 0.1..0.32。 */
        barbRadius: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.1, 0.32).round(2),
            "单针判定半径", {
                unit: "格",
                description: "每根毒针的横向判定半径；大个子针更粗。"
            }),
        /** 中毒概率：基础 0.5，攻击每比 60 多 1 加 0.001，倾泻 ×1.15，夹在 0.3..0.75。 */
        poisonChance: percent(
            F.base(0.5).plus(F.stat("attack").minus(60).max(0).times(0.001))
                .times(F.when(F.pref("hail"), F.const(1.15), F.const(1)))
                .clamp(0.3, 0.75),
            "中毒概率", "一轮齐射结束后，若至少一针命中，按这个概率让目标中毒；攻击越高越容易留下毒。"),
        /** 中毒持续：基础 320 刻，20 级起每级 +8，夹在 280..640。 */
        venomTicks: seconds(
            F.base(320).plus(F.level().minus(20).max(0).times(8)).clamp(280, 640).round(0),
            "中毒持续", "毒尖留下的毒持续多久；等级越高挂得越久。"),
        /** 冲退距离：基础 0.12 格，体重每 10 加 0.006（上限 0.3），夹在 0.05..0.4。 */
        push: formula(
            F.base(0.12).plus(F.body("weight").div(10).times(0.006).min(0.3)).clamp(0.05, 0.4).round(2),
            "冲退距离", {
                unit: "格",
                description: "每针命中后沿射击方向的轻微冲退；大个子推得更远。"
            })
    });

    defineDamage("barbbarrage", "volley", {});

    describe("barbbarrage", [
        { key: "description.0", values: ["barbs","spread"] },
        { key: "description.1", values: ["volley","barbSpeed"] },
        { key: "description.2", values: ["poisonChance","venomTicks","push"] }
    ]);
}
