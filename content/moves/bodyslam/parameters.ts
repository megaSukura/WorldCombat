/**
 * 泰山压顶 / bodyslam 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 85、命中 100、PP 15、接触、30% 令对手麻痹（Cobblemon 1.8）。
 * 翻译：把「用整个身体压住对手」翻成一次腾空下坠的坐压——先蹲身蓄力，再朝目标上方跃起、以体重砸在落点；
 * 落点小范围内所有敌人吃伤、被推、并可能被这一下压麻。**体重是本招的主角**：威力、落点半径、麻痹概率、
 * 顶开距离都随体重走；攻击决定钝撞的狠度，速度决定腾空快慢与跳跃距离，等级给一点上限。
 * 配置 splash（震地式）把落点摊大、推开更远，但单点威力与压麻概率降低、收招与冷却更长；压顶式相反。
 *
 * 伤害段名 crush：这一压随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("bodyslam", {
        /** 压顶威力：攻击每比 60 多 1 加 0.4（上限 +44），体重每比 50 多 10 加 1.2（上限 +30）；压顶 ×1.08、震地 ×0.88；夹在 45..175。 */
        crush: formula(
            F.base(70).plus(F.stat("attack").minus(60).times(0.4).clamp(-16, 44))
                .plus(F.body("weight").minus(50).times(0.12).clamp(0, 30))
                .times(F.when(F.pref("splash"), F.const(0.88), F.const(1.08)))
                .clamp(45, 175).round(1),
            "压顶威力", {
                unit: "威力",
                description: "本段伤害的基础威力；攻击给出撞击的狠度，体重把这一下压得更沉，震地式把力道摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 落点半径：基础 1.5 格加碰撞箱宽度 ×0.9，体重每比 50 多 10 加 0.4（上限 +0.9）；震地 ×1.5、压顶 ×0.85；夹在 1.2..3.4。 */
        landRadius: formula(
            F.base(1.5).plus(F.body("width").times(0.9))
                .plus(F.body("weight").minus(50).times(0.04).clamp(0, 0.9))
                .times(F.when(F.pref("splash"), F.const(1.5), F.const(0.85)))
                .clamp(1.2, 3.4).round(2),
            "落点半径", {
                unit: "格",
                description: "落地时被一起罩住的范围；身板越宽、体重越大砸出的坑越大，震地式摊得更开。"
            }),
        /** 压麻概率：基础 0.20，体重每比 40 多 1kg 加 0.0016（上限 +0.26），等级每高 1 级加 0.002（上限 +0.10）；压顶 ×1.1、震地 ×0.85；夹在 0.12..0.60。 */
        slamChance: percent(
            F.base(0.20).plus(F.body("weight").minus(40).times(0.0016).clamp(0, 0.26))
                .plus(F.level().minus(20).times(0.002).clamp(0, 0.10))
                .times(F.when(F.pref("splash"), F.const(0.85), F.const(1.1)))
                .clamp(0.12, 0.60).round(3),
            "压麻概率", "被这一下压中后陷入麻痹的概率；越重越像被压住，震地式力道分散、更容易挣脱。"),
        /** 顶开距离：基础 0.35 格，体重每比 50 多 1kg 加 0.004（上限 +0.7）；震地 ×1.4、压顶 ×0.75；夹在 0.15..1.3。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(50).times(0.004).clamp(0, 0.7))
                .times(F.when(F.pref("splash"), F.const(1.4), F.const(0.75)))
                .clamp(0.15, 1.3).round(2),
            "顶开距离", {
                unit: "格",
                description: "落地冲击把周围目标沿背离方向推开多远；越重推得越远，震地式推得更狠。"
            }),
        /** 跃起高度：基础 1.5 格，速度每比 50 快 1 加 0.012（上限 +0.9）；夹在 1.0..2.6。 */
        hop: formula(
            F.base(1.5).plus(F.stat("speed").minus(50).times(0.012).clamp(-0.3, 0.9)).clamp(1.0, 2.6).round(2),
            "跃起高度", {
                unit: "格",
                description: "腾空到最高点的高度；动作快的个体跳得更高，滞空更久。"
            }),
        /** 腾空总时长：基础 10 刻，速度每比 50 快 1 减 0.05 刻（上限 ±4）；夹在 6..14。 */
        airTicks: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.05).clamp(-3, 4)).clamp(6, 14).round(0),
            "腾空时长", "从起跳到砸地的时间；快脚落地更干脆，留给对手的闪避窗口更短。"),
        /** 跳跃距离：基础 4.2 格，速度每比 50 快 1 加 0.03（上限 +2.0）；夹在 3.0..6.8。 */
        leap: formula(
            F.base(4.2).plus(F.stat("speed").minus(50).times(0.03).clamp(-1.2, 2.0)).clamp(3.0, 6.8).round(2),
            "跳跃距离", {
                unit: "格",
                description: "最多能从多远起跳压到目标；驱动目标接受范围。"
            }),
        minimumMove: hidden(0.05)
    });

    stages("bodyslam", [
        { level: 30, values: { cooldown: 30 } },
        { level: 48, values: { landRadius: 2.2 } }
    ]);

    defineDamage("bodyslam", "crush", { defenceCoefficient: 0.005 }, { contact: true });

    describe("bodyslam", [
        { key: "description.0", values: ["crush"] },
        { key: "description.1", values: ["landRadius", "slamChance"] },
        { key: "description.2", values: ["leap", "hop", "push"] }
    ]);
}
