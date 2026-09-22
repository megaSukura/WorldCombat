/**
 * 舌舔 / lick 的参数与伤害段。
 *
 * 原生事实：Ghost、物理、威力 30、命中 100、PP 30、接触、30% 令对手麻痹（Cobblemon 1.8）。
 * 翻译：把「用长长的舌头舔遍对手」做成一次**远超普通近战的单点长舌抽击**：舌头从嘴前snap 出去够到目标，
 * 命中很轻，真正的报酬是那一下冰凉发麻。这是本组里最便宜、最远的一记单体触碰——伤害低，但几乎随时能出手，
 * 专门用来给一个还没发麻的目标上麻痹。数据分散：攻击决定伤害、**速度**决定舌长与麻意、身高决定够距、
 * 等级决定拽力与次数。配置 coil（缠绕式）把目标往身前拽一段、麻意更重，代价是起手、收招与冷却更长。
 *
 * 伤害段名 lick：这一舔随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("lick", {
        /** 舔击威力：攻击每比 50 多 1 加 0.22（上限 +26）；夹在 12..62。 */
        lick: formula(
            F.base(20).plus(F.stat("attack").minus(50).times(0.22).clamp(-8, 26)).clamp(12, 62).round(1),
            "舔击威力", {
                unit: "威力",
                description: "本段伤害的基础威力；舌舔本就轻，靠的是随后的麻痹。对手防御、相性与暴击在命中时另算。"
            }),
        /** 舌长：基础 3.2 格加碰撞箱高度 ×0.9，等级每比 20 高 1 级加 0.02（上限 +0.9）；夹在 2.8..6.5。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").times(0.9))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.9))
                .clamp(2.8, 6.5).round(2),
            "舌长", {
                unit: "格",
                description: "舌头从嘴前snap 出去够到多远；比普通近战长得多，个子高、等级高的个体伸得更远。"
            }),
        /** 麻痹概率：基础 0.22，速度每比 55 快 1 加 0.0018（上限 +0.22），等级每高 1 级加 0.002（上限 +0.1）；缠绕式 ×1.12；夹在 0.15..0.58。 */
        numbChance: percent(
            F.base(0.22).plus(F.stat("speed").minus(55).times(0.0018).clamp(0, 0.22))
                .plus(F.level().minus(20).times(0.002).clamp(0, 0.1))
                .times(F.when(F.pref("coil"), F.const(1.12), F.const(1)))
                .clamp(0.15, 0.58).round(3),
            "麻痹概率", "一舔之后陷入麻痹的概率；出手越快这一下越突然、冰凉感越容易麻住对手，缠绕式更重。"),
        /** 拽距：基础 0.35 格，等级每比 20 高 1 级加 0.012（上限 +0.7）；只有缠绕式生效，快舔为 0；夹在 0..1.2。 */
        pull: formula(
            F.base(0.35).plus(F.level().minus(20).times(0.012).clamp(0, 0.7))
                .times(F.when(F.pref("coil"), F.const(1), F.const(0)))
                .clamp(0, 1.2).round(2),
            "拽距", {
                unit: "格",
                description: "缠绕式把命中的目标往身前拽多近；快舔形态不拽，只留伤害与麻意。"
            }),
        /** 甩舌时长：基础 6 刻，速度每比 55 快 1 减 0.02 刻（上限 ±2）；夹在 3..9。 */
        lashTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2)).clamp(3, 9).round(0),
            "甩舌时长", "舌头snap 出去到舔中的间隙；出手快的个体几乎不给对手闪避时间。"),
        /** 判定半径：基础 0.3 格加碰撞箱宽度 ×0.3；夹在 0.25..0.6。 */
        radius: formula(
            F.base(0.3).plus(F.body("width").times(0.3)).clamp(0.25, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "舌头前端的判定粗细；身体越宽舌头越粗，越不容易被走位擦掉。"
            })
    });

    stages("lick", [
        { level: 26, values: { cooldown: 20 } },
        { level: 44, values: { reach: 4.2 } }
    ]);

    defineDamage("lick", "lick", { defenceCoefficient: 0.005 }, { contact: true });

    describe("lick", [
        { key: "description.0", values: ["lick"] },
        { key: "description.1", values: ["reach", "numbChance"] },
        { key: "description.2", values: ["lashTicks", "pull"] }
    ]);
}
