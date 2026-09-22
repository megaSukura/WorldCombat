/**
 * 断尾 / shedtail 的参数与描述。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Status、PP 10；消耗自身最大生命的 1/2，造出一个耐久为最大生命 1/4
 * 的替身，然后自己换人退场（selfSwitch）。
 *
 * 翻译：断尾即脱身——尾巴留在原地，自己沿选定方向撤走；有合法后备时再由原生队伍操作收回自己、让后备登场。
 * 代价固定为最大生命一半；尾巴耐久 = 最大生命 × 尾巴比例（配置 ward 决定「尾巴多厚」）；撤走距离由
 * **速度**与**碰撞箱高度**决定，并被同一份 ward 反向拉扯（尾巴厚则撤得近、尾巴薄则撤得远）。
 * 尾巴每 20 刻把**接触范围**（由**等级**与**特攻**决定）内的敌人重新引向自己。
 * 无伤害段：这是造物＋撤离的 Status 招。
 */
namespace PokemonSkills {
    actionParameters.define("shedtail", {
        /** 生命代价：原生固定一半最大生命。 */
        cost: formula(
            F.const(0.5), "生命代价", {
                base: 0.5, presentation: "percent", format: function (value: number) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "从施法者最大生命里扣除的比例；原生就是一半，这是这招的胆量所在。"
            }),
        /** 尾巴耐久：最大生命的比例，配置 ward 决定。 */
        tail: formula(
            F.base(0.25).times(F.pref("ward")).clamp(0.12, 0.4).round(3),
            "尾巴耐久", {
                base: 0.25, presentation: "percent", format: function (value: number) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "尾巴拥有施法者最大生命的这个比例；配置 ward 越高尾巴越厚，但自己也撤得越近。"
            }),
        /** 撤离距离：速度、身高、配置 ward 共同决定。 */
        retreat: formula(
            F.base(5).plus(F.stat("speed").minus(60).max(0).times(0.03))
                .plus(F.body("height").times(0.4))
                .times(F.const(2).minus(F.pref("ward"))).clamp(2.5, 12).round(2),
            "撤离距离", {
                base: 5.0, unit: "格",
                description: "断尾后自己沿选定方向撤开多远；轻快的个体撤得更远，选择保尾则把距离折进尾巴厚度。"
            }),
        /** 牵引范围：尾巴每 20 刻把多远的敌人重新引向自己。 */
        lureRange: formula(
            F.base(8).plus(F.level().div(20)).plus(F.stat("specialAttack").minus(40).max(0).times(0.02)).clamp(8, 16).round(1),
            "牵引范围", {
                base: 8, unit: "格",
                description: "尾巴重新吸引敌人的半径；等级与特攻越高越能拉住更远的敌人。"
            }),
        /** 存在时间：尾巴最多存在多久。 */
        tailTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(4)).clamp(300, 700).round(0),
            "尾巴存在时间",
            "尾巴最多存在多久；时间到自行消散。")
    });

    stages("shedtail", [
        { level: 30, values: { prepare: 10, recover: 9, cooldown: 96 } },
        { level: 50, values: { prepare: 8, recover: 7, cooldown: 84 } }
    ]);

    describe("shedtail", [
        { key: "description.0", values: ["cost", "tail"] },
        { key: "description.1", values: ["retreat", "lureRange", "tailTicks"] },
        { key: "timing", values: ["tier.0.prepare", "tier.0.recover", "tier.0.cooldown"] }
    ]);
}
