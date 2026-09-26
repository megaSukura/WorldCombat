/**
 * 仆刀 / kowtowcleave 的参数与伤害段。
 *
 * 原生事实：Dark、物理、威力 85、命中必定（accuracy true）、PP 10、接触、劈斩（slicing）（Cobblemon 1.8）。
 * 翻译：把“下跪让对手大意后发起袭击劈向对手”翻成先制造破绽再兑现的两段——跪拜只对近处合法目标打上 dropguard
 * （空门）身份并降防，随后逐刻欺身；只有真实接触距离且视线无阻才劈中，贴上后不掷命中，所以不做随机失手。
 * 追近预算（本招射程）耗尽、被墙挡住或目标离场就挥空。空瞄也能空刀。
 * 数据分散：物攻定劈砍威力、空门加成、卸防等级、空门时长与击退，速度定欺身步长与蓄拜时长，
 * 身高定判定半径，等级定拜击范围。配置 feint（深拜）经 resolve 拉长起手与冷却，换来更深的空门。
 *
 * 伤害段：cleave 是那一刀劈砍。
 */
namespace PokemonSkills {
    actionParameters.define("kowtowcleave", {
        /** 劈砍威力：物攻每比 60 多 1 加 0.2，夹在 48..140。 */
        cleave: formula(
            F.base(78).plus(F.stat("attack").minus(60).times(0.2)).clamp(48, 140).round(1),
            "劈砍威力", { base: 78,
                unit: "威力",
                description: "劈砍那一下的威力；物攻越高刀越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 空门加成：基础 0.5，物攻每比 60 多 1 加 0.002，深拜再 +0.15，夹在 0.3..0.95。 */
        guardBonus: percent(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.002))
                .plus(F.when(F.pref("feint"), F.const(0.15), F.const(0)))
                .clamp(0.3, 0.95),
            "空门加成", "目标还带着空门时，劈砍额外增加的威力幅度。"),
        /** 卸防等级：基础 1，物攻每比 60 多 1 加 0.01，深拜再 +1，夹在 1..3 并向下取整。 */
        guardStages: formula(
            F.base(1).plus(F.stat("attack").minus(60).times(0.01))
                .plus(F.when(F.pref("feint"), F.const(1), F.const(0)))
                .clamp(1, 3).floor(),
            "卸防等级", {
                unit: "级",
                description: "跪拜让目标防御下降的能力等级；物攻越高、深拜越深，空门开得越大。"
            }),
        /** 空门时长：基础 50 刻，物攻每比 60 多 1 加 0.3，深拜再 +20，夹在 30..120。 */
        guardTicks: seconds(
            F.base(50).plus(F.stat("attack").minus(60).times(0.3))
                .plus(F.when(F.pref("feint"), F.const(20), F.const(0)))
                .clamp(30, 120).round(0),
            "空门时长", "目标空门身份停留的时长；这段窗口里劈砍才吃得到加成。"),
        /** 拜击范围：基础 4 格，等级每比 30 高 1 加 0.05，夹在 3..6。 */
        baitRange: formula(
            F.base(4).plus(F.level().minus(30).times(0.05)).clamp(3, 6).round(1),
            "拜击范围", {
                unit: "格",
                description: "跪拜能骗到多远的对手；等级高的个体能把更远的目标带进空门。"
            }),
        /** 欺身步长：基础 2.5 格，速度每比 60 快 1 加 0.02，夹在 2..4。 */
        lunge: formula(
            F.base(2.5).plus(F.stat("speed").minus(60).times(0.02)).clamp(2, 4).round(2),
            "欺身步长", { base: 2.5,
                unit: "格",
                description: "跪拜后每刻向目标推进的距离；速度快的个体扑得更快。总追近预算为本招射程，耗完仍没贴上就挥空。"
            }),
        /** 击退：基础 0.6 格，物攻每比 60 多 1 加 0.004，夹在 0.4..1.2。 */
        push: formula(
            F.base(0.6).plus(F.stat("attack").minus(60).times(0.004)).clamp(0.4, 1.2).round(2),
            "击退", {
                unit: "格",
                description: "劈中后把目标推开的距离；物攻高的个体劈得更远。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.1，夹在 0.4..0.8。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.4, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "劈砍的横向判定半径；大个子劈得更宽。"
            }),
        /** 蓄拜时长：基础 8 刻，速度每比 60 快 1 少 0.02 刻，夹在 4..12。 */
        bowTicks: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(4, 12).round(0),
            "蓄拜时长", "跪拜到欺身之间的间隔；速度快的个体拜得干脆、刀出得快。")
    });

    defineDamage("kowtowcleave", "cleave", {}, { contact: true, slice: true });

    stages("kowtowcleave", [
        { level: 40, values: { cleave: 90 } },
        { level: 55, values: { cleave: 104, lunge: 3.2 } }
    ]);

    describe("kowtowcleave", [
        { key: "description.0", values: ["cleave","guardBonus"] },
        { key: "description.1", values: ["guardStages","guardTicks","baitRange"] },
        { key: "description.2", values: ["lunge","push","collisionRadius"] },
        { key: "description.3", values: ["bowTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cleave"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cleave", "tier.1.lunge"] }
    ]);
}
