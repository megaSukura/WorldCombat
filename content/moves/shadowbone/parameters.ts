/**
 * 暗影之骨 / shadowbone 的参数与伤害段。
 *
 * 原生事实：Ghost／物理／威力 85／命中 100／PP 10／不接触（flags 只有 protect、mirror、metronome，
 * 无 contact）（Cobblemon 1.8，1 位学习者）。次要效果：20% 让目标防御下降 1 级。
 *
 * 翻译：把“用附有灵魂的骨头殴打对手”落成一记远程骨投——从身侧唤出一根缠着灵魂的骨棒，脱手掷出；灵魂自己
 * 牵引骨棒追上目标，命中时炸开阴气、发出惨叫，被击中的人被慑住、防御松动。它不接触，是破防四打里唯一能
 * 在远处兑现的一记；代价是撕防几率最低、单发冷却偏长。
 *
 * 数据分散：
 *   bone            骨棒威力：物攻定重量，等级定骨头里那份灵魂的强度。
 *   throwSpeed      投掷速度：速度定出手初速。
 *   throwRange      投掷射程：特攻定灵魂牵引延伸的距离。
 *   collisionRadius 判定半径：碰撞箱高度定骨棒命中面。
 *   rattleChance    慑防几率：物攻定阴气慑人的把握（全族最低）。
 *   rattleStages    慑防等级：本招固定 1 级。
 *   rattleTicks     慑防标记时长：等级定被慑住的时间。
 *   gravity         骨棒下坠（固定值）。
 *
 * 伤害段 bone：骨棒命中那一下，不接触；属性相性与暴击由共享结算处理。
 */
namespace PokemonSkills {
    actionParameters.define("shadowbone", {
        /** 骨棒威力：基础 78，物攻每比 60 多 1 加 0.14，等级每比 40 高 1 加 0.2，夹在 50..120。 */
        bone: formula(
            F.base(78).plus(F.stat("attack").minus(60).times(0.14).clamp(-18, 30))
                .plus(F.level().minus(40).times(0.2).clamp(-4, 12))
                .clamp(50, 120).round(1),
            "骨棒威力", {
                unit: "威力",
                description: "骨棒砸中那一下的基础威力；物攻越高骨越沉，等级越高骨头里的灵魂越强。对手防御、相性与暴击在命中时另算。"
            }),
        /** 投掷速度：基础 1.0 格/刻，速度每比 55 快 1 加 0.004，夹在 0.85..1.35。 */
        throwSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.004)).clamp(0.85, 1.35).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "骨棒脱手时的初速；速度快的个体出手更急，目标更难躲。"
            }),
        /** 投掷射程：基础 6.0 格，特攻每比 60 多 1 加 0.02，夹在 5.0..9.0。 */
        throwRange: formula(
            F.base(6.0).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1.0, 3.0)).clamp(5.0, 9.0).round(2),
            "投掷射程", {
                unit: "格",
                description: "骨棒能被灵魂牵引多远；特攻越高，灵魂把骨头送得越远。它也是本招的实际射程来源。"
            }),
        /** 判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.08，夹在 0.25..0.5。 */
        collisionRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.25, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "骨棒命中判定的半径；大个子的骨棒扫面略大。"
            }),
        /** 慑防几率：基础 0.2，物攻每比 60 多 1 加 0.0008，夹在 0.12..0.32。 */
        rattleChance: percent(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.0008)).clamp(0.12, 0.32),
            "慑防几率", "骨中灵魂的惨叫把目标慑住、防御下降的几率；全族最低，但能在远处生效。"),
        /** 慑防等级：固定 1 级。 */
        rattleStages: formula(
            F.base(1),
            "慑防等级", {
                unit: "级",
                description: "一次慑防让目标防御下降的能力等级。"
            }),
        /** 慑防标记时长：基础 100 刻，等级每比 40 高 1 加 1.5 刻，夹在 80..240。 */
        rattleTicks: seconds(
            F.base(100).plus(F.level().minus(40).times(1.5)).clamp(80, 240).round(0),
            "慑防标记时长", "目标身上慑防标记停留的时长；等级越高被慑住越久。"),
        gravity: hidden(0.015)
    });

    defineDamage("shadowbone", "bone", {}, { contact: false });

    stages("shadowbone", [
        { level: 38, values: { bone: 90 } },
        { level: 58, values: { rattleChance: 0.28 } }
    ]);

    describe("shadowbone", [
        { key: "description.0", values: ["bone"] },
        { key: "description.1", values: ["throwRange", "throwSpeed", "collisionRadius"] },
        { key: "description.additional", values: [] },
        { key: "description.2", values: ["rattleChance","rattleStages","rattleTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rattleChance"] }
    ]);
}
