/**
 * 虫之抵抗 / strugglebug 的参数与数值来源。
 *
 * 原生事实：虫／特殊／威力 50／命中 100／PP 20／目标 allAdjacentFoes（自身周围所有对手）／100% 让目标特攻下降 1 级。
 *
 * 翻译：把「抵抗并攻击对手」落成一次**撑住身形、把一团贴地的虫群从脚下向外推出去**的整圈动作——
 * 施法者原地扎稳（`stationary`），虫群贴着地面一圈圈扩开，扫到谁就把谁缠住：挨一次伤害、特攻下降 1 级，
 * 并被虫群缠在身上一小段时间、移动变慢。它是本组唯一以自身为心、可以一次削到身边所有人的那一招，
 * 代价是必须站定、射程很近。
 * 与同族分开：魔法闪耀是一圈光、只减速；虫之抵抗是一圈会爬的虫，缠上后拖着走不动的也是它。
 *
 * 数值来源（每项读不同的精灵数据）：
 *   swarm      虫群威力：特攻定虫群的密度与撕咬、等级定虫群的成熟度。
 *   radius     扩散半径：身高与特攻定虫群能铺到多远，也是本招射程与画面里的圈。
 *   frontSpeed 扩散速度：速度定虫群前缘每刻推几格，快的个体一口铺开。
 *   clingTicks 缠身时长：特攻与等级定虫群能在身上缠多久。
 *   dropStages 特攻下降级数：固定 1 级（原生 100%）。
 *   motes      虫点数量：特攻定，也驱动画面密度。
 *   tempo／aftercast／recharge：速度定节奏，厚势式更慢更久。
 *
 * 配置 `brood`（厚势式，默认开）：开＝半径 ×1.2、缠身 ×1.3，代价是威力 ×0.85、起手 +2、冷却 +4；关（疾涌式）＝
 * 威力 ×1.12、扩散 ×1.15，半径收到 ×0.85、缠身更短。铺一片 vs 撕一口，两向各有局面。
 *
 * 伤害段 `swarm`：虫群前缘扫到每人身上各结算一次，沿用原生类别（Special）。
 */
namespace PokemonSkills {
    export const strugglebugId = "strugglebug";
    export const strugglebugScene = "world_combat:move_strugglebug";
    export const strugglebugEffect = "world_combat:infested";
    export const strugglebugClingText = "world_combat.move.strugglebug.text.cling";
    export const strugglebugMissText = "world_combat.move.strugglebug.text.miss";

    actionParameters.define(strugglebugId, {
        /** 虫群威力：30 + 特攻偏移[−6,22] + 等级(≥25)偏移[0,8]；厚势 ×0.85 / 疾涌 ×1.12；夹 20..70。 */
        swarm: formula(
            F.base(30)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-6, 22))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("brood"), F.const(0.85), F.const(1.12)))
                .clamp(20, 70).round(1),
            "虫群威力", {
                unit: "威力",
                description: "虫群前缘扫到每人身上各自结算一次的基础威力；特攻越高虫群越密、等级越高虫群越成熟。对手特防、相性与暴击在命中时另算。"
            }),
        /** 扩散半径：2.6 + 身高偏移[−0.25,1.0] + 特攻偏移[0,0.8]；厚势 ×1.2 / 疾涌 ×0.85；夹 1.8..4.6。 */
        radius: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.25, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.8))
                .times(F.when(F.pref("brood"), F.const(1.2), F.const(0.85)))
                .clamp(1.8, 4.6).round(2),
            "扩散半径", {
                unit: "格",
                description: "虫群从脚下能铺出去多远；体型高、特攻强的个体铺得越开。它也是本招的实际射程、指示圈与画面里的地圈半径。"
            }),
        /** 扩散速度：0.34 + 速度偏移[−0.08,0.2]；厚势 ×0.9 / 疾涌 ×1.15；夹 0.2..0.6。 */
        frontSpeed: formula(
            F.base(0.34).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.2))
                .times(F.when(F.pref("brood"), F.const(0.9), F.const(1.15)))
                .clamp(0.2, 0.6).round(3),
            "扩散速度", {
                unit: "格/刻",
                description: "虫群前缘每刻向外推的距离；速度快的个体一口铺开，目标更难在合拢前走出去。"
            }),
        /** 缠身时长：60 + 特攻偏移[−16,50] + 等级(≥20)偏移[0,12]；厚势 ×1.3 / 疾涌 ×0.85；夹 40..160。 */
        clingTicks: seconds(
            F.base(60)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-16, 50))
                .plus(F.level().minus(20).times(0.3).clamp(0, 12))
                .times(F.when(F.pref("brood"), F.const(1.3), F.const(0.85)))
                .clamp(40, 160).round(0),
            "缠身时长", "被虫群缠住、带着 world_combat:status/infested 移动变慢的时间；特攻越强、等级越高缠得越久。"),
        /** 特攻下降：固定 1 级，与原生 100% 一致。 */
        dropStages: formula(
            F.base(1),
            "特攻下降", {
                unit: "级",
                description: "被虫群扫到的目标特攻下降的能力等级；对宝可梦落到原生特攻等级，对其他战斗者落到攻击阶梯。"
            }),
        /** 虫点数量：24 + 特攻偏移[−8,20]；夹 16..60。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 20)).clamp(16, 60).round(0),
            "虫点数量", {
                unit: "个",
                description: "虫群铺开时同时涌出的虫点数量；特攻越高越密，粒子也按它发射。"
            }),
        /** 起手：7 − 速度偏移[−1,2] + 厚势 2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2))
                .plus(F.when(F.pref("brood"), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "撑住身形、把虫群拢到脚下再推出去的时间；速度越快越短，厚势式多蓄一点。"),
        /** 收招：7 − 速度偏移[−1,2]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2)).clamp(4, 12).round(0),
            "收招", "虫群散去、重新站起的时间；速度越快收得越干脆。"),
        /** 冷却：22 − 速度偏移[−3,5] + 厚势 4；夹 14..36。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("brood"), F.const(4), F.const(0)))
                .clamp(14, 36).round(0),
            "冷却", "两次推虫之间的等待；速度越快回得越快，厚势式等得更久。")
    });

    defineDamage(strugglebugId, "swarm", {});

    stages(strugglebugId, [
        { level: 30, values: { swarm: 38 } },
        { level: 48, values: { radius: 3.0, clingTicks: 80 } }
    ]);

    describe(strugglebugId, [
        { key: "description.0", values: ["swarm"] },
        { key: "description.1", values: ["dropStages","clingTicks"] },
        { key: "description.2", values: ["radius","frontSpeed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["brood"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["brood"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swarm"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.radius", "tier.1.clingTicks"] }
    ]);
}
