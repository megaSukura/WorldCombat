/**
 * 尖石攻击 / stoneedge —— 参数与伤害段。
 *
 * 原生事实：Rock／物理／威力 100／命中 80／PP 5／不接触／critRatio 2（Cobblemon 1.8，214 位学习者）。
 * 原生描述：「用尖尖的岩石刺入对手进行攻击，容易击中要害」。
 *
 * 翻译：把「尖石刺入」落成一条**从施法者脚下裂向目标、沿地面一路竖起的石刺脊**：脊是一段一段顶出来的，
 *   站在脊带上的人被从下方刺中，站偏一步就只被擦过或躲开——原生的 80 命中在这里就是位置判定。击中的脊段
 *   把地表顶裂，裂隙按 `scarTicks` 留在原地再合上（真实地形，到期原方块回来）。它是本组唯一的远程直线招，
 *   靠「把目标框在裂缝上」而不是靠近身出手。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   spike       石刺威力：物攻定锋刃，等级定发力。
 *   reach       裂线长度：身高决定脊能裂到多远，速度决定裂得快不快；也是实际射程。
 *   half        裂线半宽：碰撞箱宽度决定脊带铺多宽。
 *   segments    石刺段数：等级与「散刺」档位决定脊由几段顶出，驱动画面里的推进拍数。
 *   pierce      穿透保留：速度决定同一条脊上越靠后的目标还剩几成威力（第一名吃满）。
 *   scarTicks   裂隙留存：等级决定地面裂开后在原地留多久。
 *   dust        碎石数量：物攻与体重决定画面里的碎石量，直接驱动发射量。
 *   tempo／aftercast／recharge 时序：速度决定起手、收招与冷却；散刺档位更慢更缓。
 *
 * 配置 wide（散刺）：开启＝裂线半宽 ×1.8、石刺段数 +2、更宽的脊带罩住并排的人，代价是威力 ×0.9、裂线更短
 *   （×0.85）、起手 +1 刻、冷却 +5 刻；关闭＝尖刺式，一条窄而长的缝，威力 ×1.06、射程 ×1.1，代价是只能刺到一条线上的人。
 *
 * 伤害段 spike：石刺顶出的那一下（不接触）；同一条脊上越靠后的目标按 pierce 递减。
 */
namespace PokemonSkills {
    export const stoneedgeId = "stoneedge";
    export const stoneedgeScene = "world_combat:move_stoneedge";
    export const stoneedgePierceText = "world_combat.move.stoneedge.text.pierce";
    export const stoneedgeMissText = "world_combat.move.stoneedge.text.miss";

    actionParameters.define(stoneedgeId, {
        /** 石刺威力：基础 72，物攻每比 60 多 1 加 0.3（夹 -14..34），等级每比 30 高 1 加 0.35（夹 -7..14）；散刺 ×0.9 / 尖刺 ×1.06；夹在 46..138。 */
        spike: formula(
            F.base(72).plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 34))
                .plus(F.level().minus(30).times(0.35).clamp(-7, 14))
                .times(F.when(F.pref("wide"), F.const(0.9), F.const(1.06)))
                .clamp(46, 138).round(1),
            "石刺威力", {
                unit: "威力",
                description: "这一段石刺从地下顶出时的基础威力；物攻定锋刃、等级定发力，尖刺式更集中、散刺式略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 裂线长度：基础 5.4 格，身高每比 1.4 高 1 加 1.1（夹 -0.5..1.5），速度每比 55 快 1 加 0.01（夹 -0.3..0.6）；散刺 ×0.85 / 尖刺 ×1.1；夹在 3.6..7.0。 */
        reach: formula(
            F.base(5.4).plus(F.body("height").minus(1.4).times(1.1).clamp(-0.5, 1.5))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.6))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.1)))
                .clamp(3.6, 7.0).round(2),
            "裂线长度", {
                unit: "格",
                description: "裂缝从脚下延伸到多远；身高的个体把脊顶得更远，快的个体裂得更利落。它也是本招的实际射程来源。"
            }),
        /** 裂线半宽：基础 0.5 格，碰撞箱每比 0.9 宽 1 加 0.3（夹 -0.1..0.4）；散刺 ×1.8；夹在 0.35..1.3。 */
        half: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.4))
                .times(F.when(F.pref("wide"), F.const(1.8), F.const(1)))
                .clamp(0.35, 1.3).round(2),
            "裂线半宽", {
                unit: "格",
                description: "石刺脊带的横向半宽；身体越宽的个体脊带越宽，散刺式再铺开一截。画面里的脊带就是会被刺到的那块地。"
            }),
        /** 石刺段数：基础 5，等级每比 20 高 1 加 0.05（夹 0..4），散刺 +2；夹在 4..10 并向下取整。 */
        segments: formula(
            F.base(5).plus(F.level().minus(20).times(0.05).clamp(0, 4))
                .plus(F.when(F.pref("wide"), F.const(2), F.const(0)))
                .clamp(4, 10).floor(),
            "石刺段数", {
                unit: "段",
                description: "这条脊由几段石刺依次顶出；段数越多，画面里的推进越细密、越容易被一步跨开。"
            }),
        /** 穿透保留：基础 0.72，速度每比 55 快 1 加 0.001（夹 -0.06..0.08）；夹在 0.5..0.85。 */
        pierce: percent(
            F.base(0.72).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.06, 0.08)).clamp(0.5, 0.85).round(3),
            "穿透保留", "同一条脊上越靠后的目标，威力按这个比例递减；第一名吃满。速度快的个体裂得干脆，靠后的保留更多。"),
        /** 裂隙留存：基础 90 刻，等级每比 30 高 1 加 0.6 刻（夹 0..40）；夹在 70..150。 */
        scarTicks: seconds(
            F.base(90).plus(F.level().minus(30).times(0.6).clamp(0, 40)).clamp(70, 150).round(0),
            "裂隙留存", "被顶裂的地面在原地留多久再合上；等级越高裂痕留得越久。"),
        /** 碎石数量：基础 16，体重每比 300 多 1 加 0.01（夹 -4..10），物攻每比 60 多 1 加 0.08（夹 -5..12）；夹在 10..34 并向下取整。 */
        dust: formula(
            F.base(16).plus(F.body("weight").minus(300).times(0.01).clamp(-4, 10))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-5, 12))
                .clamp(10, 34).floor(),
            "碎石数量", {
                unit: "点",
                description: "每段石刺顶出时崩落的碎石数量；物攻与体重越高碎得越密，直接驱动画面的发射量。"
            }),
        /** 起手：基础 12 刻，速度每比 55 快 1 减 0.03 刻（夹 -2..4），散刺 +1；夹在 7..17。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("wide"), F.const(1), F.const(0))).clamp(7, 17).round(0),
            "起手", "蹲身把地气压进裂缝、准备顶出石刺的时间；速度越快越短，散刺式略久。"),
        /** 收招：基础 10 刻，速度每比 55 快 1 减 0.02 刻，夹在 5..12。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02)).clamp(5, 12).round(0),
            "收招", "石刺顶完后收势的时间。"),
        /** 冷却：基础 42 刻，速度每比 55 快 1 减 0.08 刻，散刺 +5；夹在 26..66。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(55).times(0.08))
                .plus(F.when(F.pref("wide"), F.const(5), F.const(0))).clamp(26, 66).round(0),
            "冷却", "再次裂地前的等待；速度越快回得越快，散刺式缓得更久。")
    });

    defineDamage(stoneedgeId, "spike", {});

    stages(stoneedgeId, [
        { level: 40, values: { spike: 84 } },
        { level: 56, values: { spike: 96, reach: 6.0 } }
    ]);

    describe(stoneedgeId, [
        { key: "description.0", values: ["spike","half"] },
        { key: "description.1", values: ["reach", "segments"] },
        { key: "description.2", values: ["pierce","scarTicks"] },
        { key: "stance.wide", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "stance.sharp", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spike", "tier.1.reach"] }
    ]);
}
