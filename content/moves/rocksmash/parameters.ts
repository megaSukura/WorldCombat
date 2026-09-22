/**
 * 碎岩 / rocksmash 的参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 40／命中 100／PP 15／接触、punch（Cobblemon 1.8，412 位学习者）。
 * 次要效果：50% 让目标防御下降 1 级。
 *
 * 翻译：把“用拳头打、有时砸低防御”落成贴脸的一串快拳——低头半沉、拳骨连点对手正面最硬处。它是破防四打里
 * 最便宜、最快的一记：单下最轻，靠打得勤和收拳时的一次拆防把对手越打越薄。命中 100 落成“不会瞄偏”，
 * 代价是每记都轻、拳程很短，必须站到脸上。
 *
 * 数据分散（每项读不同的精灵数据，小差距因此在场上放大）：
 *   jab             单拳威力：物攻定拳重。
 *   jabs            拳数：速度定连出几下（2–3）。
 *   jabGap          拳间隔：速度定节奏。
 *   reach           拳程：碰撞箱宽度定臂展能探多远。
 *   collisionRadius 判定半径：碰撞箱高度定拳面大小。
 *   crackChance     破防几率：物攻定砸开缺口的把握。
 *   crackStages     破防等级：本招固定 1 级；多记拳可以叠，所以反复碎岩会把防御压到很低。
 *   markTicks       破防标记时长：等级定缺口留多久。
 * 等级阶梯在 40 级抬高单拳、56 级抬高破防几率。
 *
 * 伤害段 jab：每一记快拳，走共享换算；contact 与 punch 交给共享结算（接触反伤、拳类特性/道具）。
 */
namespace PokemonSkills {
    actionParameters.define("rocksmash", {
        /** 单拳威力：物攻每比 60 多 1 加 0.06，夹在 11..30。 */
        jab: formula(
            F.base(17).plus(F.stat("attack").minus(60).times(0.06).clamp(-6, 9)).clamp(11, 30).round(1),
            "单拳威力", {
                unit: "威力",
                description: "每一记快拳的基础威力；物攻越高拳骨越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拳数：基础 2 记，速度每比 55 快 1 加 0.01，夹在 2..3 并向下取整。 */
        jabs: formula(
            F.base(2).plus(F.stat("speed").minus(55).times(0.01)).clamp(2, 3).floor(),
            "拳数", {
                unit: "记",
                description: "一次出拳打几下；越快的个体越能连上第三记。"
            }),
        /** 拳间隔：基础 5 刻，速度每比 55 快 1 减 0.02 刻（慢则相反），夹在 3..8。 */
        jabGap: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02)).clamp(3, 8).round(0),
            "拳间隔", "两记拳之间的间隔；节奏快的个体连得更紧。"),
        /** 拳程：基础 1.25 格，碰撞箱每比 0.9 宽 1 格加 0.5，夹在 1.1..2.0。 */
        reach: formula(
            F.base(1.25).plus(F.body("width").minus(0.9).times(0.5)).clamp(1.1, 2.0).round(2),
            "拳程", {
                unit: "格",
                description: "拳头能探到多远的正面；身体越宽的个体臂展越长。它也是本招的实际射程来源。"
            }),
        /** 判定半径：基础 0.32 格，碰撞箱每比 1.4 高 1 格加 0.1，夹在 0.25..0.55。 */
        collisionRadius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.25, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "拳面横扫的判定半径；大个子的拳面更宽。"
            }),
        /** 破防几率：基础 0.5，物攻每比 60 多 1 加 0.0015，夹在 0.35..0.65。 */
        crackChance: percent(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.0015)).clamp(0.35, 0.65),
            "破防几率", "整套拳打完若有一记打实，砸开缺口、让目标防御下降的几率；物攻越高越稳。"),
        /** 破防等级：固定 1 级。 */
        crackStages: formula(
            F.base(1),
            "破防等级", {
                unit: "级",
                description: "一次破防让目标防御下降的能力等级；多记拳各掷一次，所以反复碎岩能把防御越压越低。"
            }),
        /** 标记时长：基础 80 刻，等级每比 40 高 1 加 1.2 刻，夹在 60..200。 */
        markTicks: seconds(
            F.base(80).plus(F.level().minus(40).times(1.2)).clamp(60, 200).round(0),
            "破防标记时长", "目标身上破防标记停留的时长；等级越高缺口留得越久，队友来得及接着打。")
    });

    defineDamage("rocksmash", "jab", {}, { contact: true, punch: true });

    stages("rocksmash", [
        { level: 40, values: { jab: 20 } },
        { level: 56, values: { crackChance: 0.6 } }
    ]);

    describe("rocksmash", [
        { key: "description.0", values: ["jab", "jabs"] },
        { key: "description.1", values: ["reach", "collisionRadius"] },
        { key: "description.2", values: ["crackChance", "crackStages", "markTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crackChance"] }
    ]);
}
