/**
 * 影子偷袭 / shadowsneak —— 参数与伤害段。
 *
 * 原生事实：幽灵／物理／威力 40／命中 100／PP 30／优先度 +1／接触，无次要效果（Cobblemon 1.8，39 位学习者）。
 *   描述「伸长影子，从对手的背后进行攻击。必定能够先制攻击」。
 *
 * 翻译：把「先制」翻成一记**贴地探出的短影**：施法者本人不动，影子沿地面朝提交方向爬出去，遇到实墙就停；
 *   第一个被影子踩中的敌人，从**背侧**立起一刀。它不再抓取、不减速、也不穿墙点人——只打真正踩上来的那一个。
 *   它是全族最便宜、最快的一记先制起手。
 *   与最像的暗影拳分开：暗影拳从对手自己的影子里升起一只拳、从不失手、位置在正面；影子偷袭从**背面**刺，
 *   只认地面上的第一只脚，暗影拳是重拳（60），影子偷袭是轻快的一刺（40）。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   sneak   影刃威力：物攻给刀份量、速度给影子窜出的冲力。
 *   reach   影子长度：等级与体型决定影子能伸多远，也是射程来源。
 *   seep    蔓延速度：速度决定影子沿地面爬多快（决定命中延迟，对手看到它爬过来）。
 *   blade   判定半径：身高决定影刃多宽，也是前沿投射物的判定半径。
 *   shade   影屑数量：速度与等级驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定起手、收招与冷却。
 *
 * 伤害段 `sneak` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const shadowsneakId = "shadowsneak";
    export const shadowsneakScene = "world_combat:move_shadowsneak";
    export const shadowsneakHitText = "world_combat.move.shadowsneak.text.hit";
    export const shadowsneakMissText = "world_combat.move.shadowsneak.text.miss";

    actionParameters.define(shadowsneakId, {
        /** 影刃威力：40 +（物攻 − 55）× 0.22 [−8,22] +（速度 − 55）× 0.10 [−3,12]；夹 24..92。 */
        sneak: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-8, 22))
                .plus(F.stat("speed").minus(55).times(0.10).clamp(-3, 12))
                .clamp(24, 92).round(1),
            "影刃威力", {
                base: 40, unit: "威力",
                description: "影子从背后刺出的那一刀；物攻给刀的份量、速度给影子窜出的冲力。对手防御、相性与暴击在命中时另算。"
            }),
        /** 影子长度：6.2 +（等级 − 30）× 0.06 [−0.6,0.9] +（身高 − 1.4）× 0.5 [−0.2,0.8]；夹 4..11。 */
        reach: formula(
            F.base(6.2)
                .plus(F.level().minus(30).times(0.06).clamp(-0.6, 0.9))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .clamp(4, 11).round(2),
            "影子长度", {
                base: 6.2, unit: "格",
                description: "影子能从脚下沿地面探出多远，也是本招的实际射程来源；等级越高、身形越大伸得越远，遇到实墙会提前停下。"
            }),
        /** 蔓延速度：1.7 +（速度 − 55）× 0.008 [−0.3,0.6]；夹 1.2..2.6。 */
        seep: formula(
            F.base(1.7).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.3, 0.6)).clamp(1.2, 2.6).round(2),
            "蔓延速度", {
                base: 1.7, unit: "格/刻",
                description: "影子沿地面爬向对手的速度；速度快的个体刀来得更早，对手更少时间挪开。"
            }),
        /** 判定半径：0.38 +（身高 − 1.4）× 0.09 [−0.06,0.22]；夹 0.30..0.68。 */
        blade: formula(
            F.base(0.38).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.06, 0.22)).clamp(0.30, 0.68).round(2),
            "判定半径", {
                base: 0.38, unit: "格",
                description: "影刃扫过活体的横向半径，也是前沿的判定粗细；身板越大凝出的刃越宽。表现与判定共用它。"
            }),
        /** 影屑数量：16 +（速度 − 55）× 0.28 [−3,12] +（等级 − 30）× 0.15 [−1,4]；夹 12..40。 */
        shade: formula(
            F.base(16).plus(F.stat("speed").minus(55).times(0.28).clamp(-3, 12))
                .plus(F.level().minus(30).times(0.15).clamp(-1, 4)).clamp(12, 40).round(0),
            "影屑数量", {
                base: 16, unit: "点",
                description: "影子爬行与刺出时带起的影屑数量，也直接驱动画面的发射量；速度与等级越高越密。"
            }),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 1..5 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(1, 5).round(0),
            "起手", "影子在脚下攒起来的时间；它是先制招，几乎一眨眼就窜出去。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 3..8 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(3, 8).round(0),
            "收招", "影子收回脚下、人站定的时间。"),
        /** 冷却：16 −（速度 − 55）× 0.06 [−1.5,2.5]；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.06).clamp(-1.5, 2.5)).clamp(10, 28).round(0),
            "冷却", "两次偷袭之间的等待；背刺式回得最快，是全族最便宜的先制。")
    });

    defineDamage(shadowsneakId, "sneak", {}, { contact: true });

    stages(shadowsneakId, [
        { level: 20, values: { sneak: 50 } },
        { level: 36, values: { sneak: 60, reach: 7.0 } }
    ]);

    describe(shadowsneakId, [
        { key: "description.0", values: ["sneak"] },
        { key: "description.1", values: ["reach", "seep", "blade"] },
        { key: "timing", values: ["reach", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sneak"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sneak", "tier.1.reach"] }
    ]);
}
