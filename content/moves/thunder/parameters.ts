/**
 * 打雷 / thunder 的参数与伤害段。
 *
 * 原生事实：Electric、特殊、威力 110、命中 70（雨/大暴雨必中、大晴天降到 50）、PP 10、30% 令对手麻痹（Cobblemon 1.8）。
 * 翻译：把「向对手劈下暴雷」翻成**从天空垂直落下的天雷**：不是从施法者飞出的投射物，而是先蓄云、再在目标
 * 落点砸下一柱雷光。命中率就是本招的性格——**下雨必中、晴天更容易打偏**，被屋顶遮住则根本劈不下来。
 * 数据分散：特攻决定伤害、落点半径与感电概率；身高决定雷柱粗细；等级决定射程与上限；雨与目标的湿身现场
 * 直接进入公式。配置 charged（聚云式）换更长前摇与更集中的落点，换来更高伤害与更小散布。
 *
 * 伤害段名 bolt：这一柱雷随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("thunder", {
        /** 落雷威力：特攻每比 60 多 1 加 0.45（上限 +54）；下雨 ×1.12；聚云 ×1.06；夹在 60..180。 */
        bolt: formula(
            F.base(95).plus(F.stat("specialAttack").minus(60).times(0.45).clamp(-16, 54))
                .times(F.when(F.world("rain"), F.const(1.12), F.const(1)))
                .times(F.when(F.pref("charged"), F.const(1.06), F.const(1)))
                .clamp(60, 180).round(1),
            "落雷威力", {
                unit: "威力",
                description: "本段伤害的基础威力；特攻越强雷越沉，雨天导电再抬高一截。对手特防、相性与暴击在命中时另算。"
            }),
        /** 落点半径：基础 1.8 格加碰撞箱高度 ×0.4，特攻每比 60 多 1 加 0.008（上限 +0.5）；聚云 ×1.15；夹在 1.4..3.4。 */
        strikeRadius: formula(
            F.base(1.8).plus(F.body("height").times(0.4))
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 0.5))
                .times(F.when(F.pref("charged"), F.const(1.15), F.const(1)))
                .clamp(1.4, 3.4).round(2),
            "落点半径", {
                unit: "格",
                description: "雷柱落地时被电到的范围；个子高、特攻强的个体雷柱更粗。"
            }),
        /** 感电概率：基础 0.22，特攻每比 60 多 1 加 0.0016（上限 +0.24），目标湿身 +0.08，等级每高 1 级 +0.002（上限 +0.10）；夹在 0.12..0.62。 */
        thunderChance: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(0, 0.24))
                .plus(F.when(F.target("actor.wet"), F.const(0.08), F.const(0)))
                .plus(F.level().minus(20).times(0.002).clamp(0, 0.10))
                .clamp(0.12, 0.62).round(3),
            "感电概率", "被这一柱雷劈中后陷入麻痹的概率；特攻越高、目标越湿，感电越容易。"),
        /** 施放距离：基础 12 格，等级每比 20 高 1 级加 0.06（上限 +5）；夹在 12..18。 */
        boltRange: formula(
            F.base(12).plus(F.level().minus(20).times(0.06).clamp(0, 5)).clamp(12, 18).round(1),
            "施放距离", {
                unit: "格",
                description: "能锁定多远处的落点；等级越高够得越远。"
            }),
        /** 落雷前摇：基础 10 刻，下雨 -4 刻，聚云 +6 刻；夹在 3..18。 */
        chargeTicks: seconds(
            F.base(10).minus(F.when(F.world("rain"), F.const(4), F.const(0)))
                .plus(F.when(F.pref("charged"), F.const(6), F.const(0)))
                .clamp(3, 18).round(0),
            "落雷前摇", "蓄云到雷落下的时间；雨天雷云更近，聚云式要多蓄一会儿。"),
        skyHeight: hidden(12)
    });

    stages("thunder", [
        { level: 30, values: { bolt: 120 } },
        { level: 52, values: { strikeRadius: 2.6 } }
    ]);

    defineDamage("thunder", "bolt", { defenceCoefficient: 0.0048 });

    describe("thunder", [
        { key: "description.0", values: ["bolt"] },
        { key: "description.1", values: ["strikeRadius","thunderChance"] },
        { key: "description.2", values: ["boltRange","chargeTicks"] },
        { key: "timing", values: ["recover","pp","cooldown"] }
    ]);
}
