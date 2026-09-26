/** 原生毒持续期、加深节奏与上限；具体伤害由 Minecraft poison 和状态策略结算。 */
namespace PokemonSkills {
    actionParameters.define("toxic", {
        /** 施毒距离：基础 10 格，30 级起每级 +0.12，夹在 8..15。 */
        reach: formula(
            F.base(10).plus(F.level().minus(30).times(0.12)).clamp(8, 15).round(1),
            "施毒距离", {
                unit: "格",
                description: "毒液能够飞到的最大距离；等级越高够得越远。"
            }),
        /** 毒液速度：基础 0.85 格/刻，速度每比 40 快 1 加 0.002，夹在 0.5..1.4。 */
        venomSpeed: formula(
            F.base(0.85).plus(F.stat("speed").minus(40).times(0.002).clamp(-0.25, 0.5)).clamp(0.5, 1.4).round(2),
            "毒液速度", {
                unit: "格/刻",
                description: "毒液飞向目标的速度；快个体抛得更急。"
            }),
        /** 判定半径：碰撞箱高度每比 1.4 高 1 格加 0.1，夹在 0.2..0.6。 */
        venomRadius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.2, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "毒液的横向判定半径；大个子判定更宽。"
            }),
        /** 毒素持续：基础 340 刻，30 级起每级 +6；毒力取向 ×0.72，持久取向 ×1.08；夹在 280..640。 */
        venomTicks: seconds(
            F.base(340).plus(F.level().minus(30).max(0).times(6))
                .times(F.when(F.pref("virulent"), F.const(0.72), F.const(1.08)))
                .clamp(280, 640).round(0),
            "毒素持续", "毒素在目标体内最多存在多久；解毒或到期结束。"),
        /** 加深间隔：基础 45 刻，速度每比 60 快 1 少 0.06 刻；毒力取向 ×0.62；夹在 18..58。 */
        escalateInterval: formula(
            F.base(45).minus(F.stat("speed").minus(60).times(0.06).clamp(-4, 20))
                .times(F.when(F.pref("virulent"), F.const(0.62), F.const(1.05)))
                .clamp(18, 58).round(0),
            "加深间隔", {
                unit: "刻",
                description: "每隔多久把毒性加深一级；快个体发作更频繁。"
            }),
        /** 毒性上限：等级阶梯决定（20 级 2 级、45 级 3 级、60 级 4 级）。 */
        ampCap: formula(
            F.base(2).round(0),
            "毒性上限", { base: 2,
                unit: "级",
                description: "毒性最多加深到第几级；每高一级，毒伤跳得更密。等级越高上限越高。"
            })
    });

    stages("toxic", [
        { level: 20, values: { ampCap: 2 } },
        { level: 45, values: { ampCap: 3 } },
        { level: 60, values: { ampCap: 4 } }
    ]);

    describe("toxic", [
        { key: "description.0", values: ["reach","venomSpeed","venomRadius"] },
        { key: "description.1", values: ["escalateInterval","venomTicks","ampCap"] },
        { key: "description.2", values: [] }
    ]);
}
