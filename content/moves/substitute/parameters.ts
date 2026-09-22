/**
 * 替身 / substitute 的参数与描述。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Status、PP 10、命中必中；消耗自身最大生命的 1/4，
 * 造出一个耐久为最大生命 1/4 的替身，替身替你承受攻击直到破碎；生命不足 1/4 时不能使用。
 *
 * 翻译：即时战斗里「替身」是一个真实站在地上的承伤活物（`world.helper`），所有指向施法者的 incoming
 * 伤害经共享 `world_combat:redirect` 转给它。生命代价取自施法者**最大生命×配置投入**；替身耐久 =
 * 实际支付的生命 × **耐久倍率**（由**防御**与**特防**决定——同一块血肉，皮糙肉厚的个体捏出的替身更厚，
 * 这是同招在不同精灵身上最直观的一处差异）。联系距离由**等级**与**速度**决定（练得越熟、连得越稳）；
 * 存在时间由**等级**决定。落点由玩家/AI 在**放置距离**内选择，距离随**碰撞箱高度**放宽。
 * 无伤害段：这是造物与保护的 Status 招，不结算伤害。
 */
namespace PokemonSkills {
    actionParameters.define("substitute", {
        /** 生命投入：最大生命的比例；配置 build 决定投入多少。 */
        cost: formula(
            F.base(0.25).times(F.pref("build")).clamp(0.12, 0.4).round(3),
            "生命投入", {
                base: 0.25, presentation: "percent", format: function (value: number) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "从施法者最大生命里扣除的比例；投入越多替身越厚，自己也越危险。"
            }),
        /** 耐久倍率：替身耐久 = 实际支付的生命 × 这个倍率。 */
        ward: formula(
            F.base(0.95).plus(F.stat("defence").minus(60).times(0.003))
                .plus(F.stat("specialDefence").minus(60).times(0.003)).clamp(0.6, 1.8).round(2),
            "耐久倍率", {
                base: 0.95, unit: "倍",
                description: "实际支付的生命乘上它得到替身耐久；防御与特防越高，替身越耐打。"
            }),
        /** 放置距离：替身能放在离自己多远的地方，同时是动作的目标接受范围。 */
        place: formula(
            F.base(2.2).plus(F.body("height").times(0.5)).clamp(2, 5).round(2),
            "放置距离", {
                base: 2.9, unit: "格",
                description: "替身能放在施法者周围多远；身形越大能放得越开。"
            }),
        /** 联系距离：替身只在施法者这个距离内替他承伤。 */
        linkRange: formula(
            F.base(7).plus(F.level().div(10)).plus(F.stat("speed").minus(40).max(0).times(0.02)).clamp(7, 16).round(1),
            "联系距离", {
                base: 7, unit: "格",
                description: "替身只在施法者这个距离内替他承伤；跑远了联系断开。"
            }),
        /** 存在时间：替身最多存在多久。 */
        wardTicks: seconds(
            F.base(400).plus(F.level().minus(20).max(0).times(5)).clamp(400, 900).round(0),
            "存在时间",
            "替身最多存在多久；时间到自动散解。")
    });

    stages("substitute", [
        { level: 30, values: { prepare: 10, recover: 9, cooldown: 100 } },
        { level: 50, values: { prepare: 8, recover: 7, cooldown: 88 } }
    ]);

    describe("substitute", [
        { key: "description.0", values: ["cost", "ward"] },
        { key: "description.1", values: ["place", "linkRange", "wardTicks"] },
        { key: "timing", values: ["tier.0.prepare", "tier.0.recover", "tier.0.cooldown"] }
    ]);
}
