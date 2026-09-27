/**
 * 冰砾 / iceshard —— 参数与伤害段。
 *
 * 原生事实：冰／物理／威力 40／命中 100／PP 30／优先度 +1／不接触、无次要效果（Cobblemon 1.8 / Showdown）。
 *   描述「瞬间制作冰块，快速地扔向对手。必定能够先制攻击」。
 *
 * 翻译：本招把「瞬间制冰、快速扔出」翻成一记**当场结出、贴直线掷出的冰砾**——起手最短（几乎瞬发），
 *   一枚冰砾高速直线飞出，撞上谁就结算 shard 物理伤害、并把击中的目标**冻得发僵**（共享身份 chill）；
 *   砸到地形只碎一撮冰碴，飞尽自然消散。它是本族唯一的远程物理招，不在世界里留下薄冰、场地或残骸。
 *
 * 与场上最像的招分开：冰冻光束是等待蓄力的贯穿光束、按特殊结算、冻成一条线；冰锥是多枚追身细锥。
 *   冰砾只有一枚、瞬发、按物理结算，落点不替换任何方块。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   shard       冰砾威力：物攻给分量、速度给掷速。
 *   reach       掷程（也是射程）：速度与等级决定扔多远。
 *   velocity    飞行速度：速度决定掷得多快，目标越难闪。
 *   radius      判定半径：身高决定冰砾多粗。
 *   chillTicks  冻僵时长：等级与体重决定僵多久。
 *   splinters   冰碴数量：速度与等级驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定节奏。
 *
 * 伤害段 `shard` 与参数同名，走共享物理换算；对手防御、相性与暴击在命中时统一结算。
 * 冻僵用的载体 world_combat:iceshard_chill 在 startup.ts 注册并打共享身份 chill（identity_only）。
 */
namespace PokemonSkills {
    export const iceshardId = "iceshard";
    export const iceshardScene = "world_combat:move_iceshard";
    export const iceshardChillEffect = "world_combat:iceshard_chill";
    export const iceshardChillText = "world_combat.move.iceshard.text.chill";
    export const iceshardMissText = "world_combat.move.iceshard.text.miss";

    actionParameters.define(iceshardId, {
        /** 冰砾威力：40 +（物攻 − 55）× 0.24 [−10,26] +（速度 − 55）× 0.12 [−4,14]；夹 26..100。 */
        shard: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.24).clamp(-10, 26))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-4, 14))
                .clamp(26, 100).round(1),
            "冰砾威力", {
                unit: "威力",
                description: "冰砾砸实的那一下；物攻给分量、速度给掷速。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掷程：11 +（速度 − 55）× 0.03 [−1.2,2.4] +（等级 − 20）× 0.04 [0,1.6]；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1.2, 2.4))
                .plus(F.level().minus(20).times(0.04).clamp(0, 1.6))
                .clamp(8, 16).round(1),
            "掷程", {
                unit: "格",
                description: "冰砾最远能扔到哪，也是本招的实际射程来源；腿快的个体扔得更远。"
            }),
        /** 飞行速度：1.6 +（速度 − 55）× 0.008 [−0.2,0.5]；夹 1.2..2.4。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .clamp(1.2, 2.4).round(2),
            "飞行速度", { unit: "格/刻", description: "冰砾飞得多急；速度快的个体扔得更快，目标越难走位躲开。" }),
        /** 判定半径：0.22 +（身高 − 1.4）× 0.05 [−0.04,0.14]；夹 0.18..0.44。 */
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.14)).clamp(0.18, 0.44).round(2),
            "判定半径", { unit: "格", description: "冰砾飞行与命中的判定粗细；体型越高冰砾越粗。画面里的冰砾大小就是它。" }),
        /** 冻僵时长：28 +（等级 − 20）× 0.4 [0,20] +（体重 − 100）× 0.03 [−3,9]；夹 20..80 刻。 */
        chillTicks: seconds(
            F.base(28).plus(F.level().minus(20).times(0.4).clamp(0, 20))
                .plus(F.body("weight").minus(100).times(0.03).clamp(-3, 9)).clamp(20, 80).round(0),
            "冻僵时长", "被冰砾砸中后冻得发僵（共享身份 chill）挂多久；等级与体重越高僵得越久，移动更慢。这是短暂的霜寒，不是长控。"),
        /** 冰碴数量：16 +（速度 − 55）× 0.26 [−3,12] +（等级 − 20）× 0.3 [0,8]；夹 12..40。 */
        splinters: formula(
            F.base(16).plus(F.stat("speed").minus(55).times(0.26).clamp(-3, 12))
                .plus(F.level().minus(20).times(0.3).clamp(0, 8)).clamp(12, 40).round(0),
            "冰碴数量", {
                unit: "点",
                description: "冰砾飞行拖尾与命中炸开的冰碴数量，也直接驱动画面的发射量；速度与等级越高越密。"
            }),
        /** 起手：1 −（速度 − 55）× 0.01 [−0.5,0.9]；夹 0..3 刻。 */
        tempo: seconds(
            F.base(1).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 0.9)).clamp(0, 3).round(0),
            "起手", "从结冰到掷出去之间的时间；几乎瞬发，这就是「先制」。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.5]；夹 3..9 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .clamp(3, 9).round(0),
            "收招", "掷完站稳的时间。"),
        /** 冷却：16 −（速度 − 55）× 0.07 [−2,3]；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.07).clamp(-2, 3))
                .clamp(10, 28).round(0),
            "冷却", "再结一块冰砾前等待多久；本招很短。")
    });

    defineDamage(iceshardId, "shard", {}, {});

    stages(iceshardId, [
        { level: 18, values: { shard: 50 } },
        { level: 36, values: { shard: 62, reach: 12.5 } }
    ]);

    describe(iceshardId, [
        { key: "description.0", values: ["shard", "radius"] },
        { key: "description.1", values: ["reach","velocity","chillTicks"] },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shard"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shard", "tier.1.reach"] }
    ]);
}
