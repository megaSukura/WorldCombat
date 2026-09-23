/**
 * 剧毒 / toxic 的参数。
 *
 * 原生事实：Poison、变化、威力 0、命中 90、PP 10、单体，命中后目标陷入剧毒，毒伤随回合加重（Cobblemon 1.8）。
 * 翻译：原作的“随回合加重”翻成真实世界的一条时钟——毒渗进身体后每 `escalateInterval` 加一级，
 * 让共享的 `minecraft:poison`（amplifier≥1 即剧毒身份）跳得更频繁；加到最后一级时毒素总爆发，
 * 直接扣掉目标最大生命的一个比例（这一下可以击杀，而普通毒性伤害不能）。
 * 数据分散：施毒距离随**等级**、毒液速度随**速度**、判定随**碰撞箱高度**、加深节奏随**速度**、
 * 爆发比例与毒性上限随**特攻**与**等级**。配置 virulent（毒力取向）用更短的持续换更快的加深与更大的爆发。
 *
 * 公式即最终值，执行、AI 与悬浮说明读同一棵树。
 */
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
            "毒素持续", "毒素在目标体内最多存在多久；走完自己的时间会以一次爆发收尾。"),
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
            }),
        /** 爆发比例：基础 8% 最大生命，特攻每比 80 高 1 加 0.04%；毒力取向 ×1.3；夹在 5%..18%。 */
        burstShare: percent(
            F.base(0.08).plus(F.stat("specialAttack").minus(80).times(0.0004).clamp(-0.02, 0.06))
                .times(F.when(F.pref("virulent"), F.const(1.3), F.const(1)))
                .clamp(0.05, 0.18),
            "爆发比例", "毒素总爆发时按目标最大生命扣掉的比例；这一下可以击杀。特攻越高爆发越重。")
    });

    stages("toxic", [
        { level: 20, values: { ampCap: 2 } },
        { level: 45, values: { ampCap: 3 } },
        { level: 60, values: { ampCap: 4 } }
    ]);

    describe("toxic", [
        { key: "description.0", values: ["reach","venomSpeed","venomRadius"] },
        { key: "description.1", values: ["escalateInterval","venomTicks","ampCap"] },
        { key: "description.2", values: ["burstShare"] }
    ]);
}
