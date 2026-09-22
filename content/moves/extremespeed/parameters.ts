/**
 * 神速 / extremespeed —— 参数与伤害段。
 *
 * 原生事实：一般／物理／威力 80／命中 100／PP 5／优先度 +2／接触，无次要效果（Cobblemon 1.8，14 位学习者）。
 *   描述「以迅雷不及掩耳之势猛撞向对手进行攻击。必定能够先制攻击」。全族威力最高、PP 最低、优先度最高。
 *
 * 翻译：本招把「必先制、威力最高」翻成**一道长到看不见中间过程的直线，整个人像被抽掉一样射出去**：
 *   起手最低可到 0 刻（提交即冲），冲刺距离约两倍于电光一闪、每刻位移也是全族最快；撞上活体是这一族最重的
 *   一记撞击，并把它狠狠顶开。默认贯穿式（overrun）：撞上后不停，从对方身上穿过去，再冲一小段停在它身后——
 *   它同时是一招换位手段，代价是这一下略轻、收招更久、冷却极长（原生 5 PP）。
 *   与最像的电光一闪分开：距离约两倍、速度更快、命中后贯穿并停到身后、冲击重得多、冷却高得多；
 *   电光一闪是点到为止的短促先手。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   ram             撞击威力：攻击给份量、速度给冲势、等级给底气；贯穿式 ×0.9。
 *   burst           冲刺距离：速度与等级决定这一记能冲多远，也是射程来源（全族最长）。
 *   pace            每刻位移：速度决定快到什么程度（全族最快）。
 *   collisionRadius 判定半径：身高决定撞得多宽。
 *   push            顶开距离：攻击与体重决定把目标撞开多远。
 *   carry           穿过距离：速度与体重决定贯穿后还能冲多远；重撞式（关闭贯穿）为 0。
 *   wake            残影数量：速度驱动，表现按它铺出整条残影。
 *   tempo/settle/recharge 速度决定起手、收招与冷却；贯穿式收招更久。
 *
 * 配置 `overrun`（贯穿式）双向取舍：开启＝撞上不停、从对方身上穿过去再冲一小段（换位／继续追），
 *   但这一下 ×0.9、收招 +3；关闭＝重撞式，撞中即停、这一下最重、收招更快。一个换位置，一个换分量。
 *
 * 伤害段 `ram` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const extremespeedId = "extremespeed";
    export const extremespeedScene = "world_combat:move_extremespeed";
    export const extremespeedHitText = "world_combat.move.extremespeed.text.hit";
    export const extremespeedMissText = "world_combat.move.extremespeed.text.miss";
    export const extremespeedThroughText = "world_combat.move.extremespeed.text.through";

    actionParameters.define(extremespeedId, {
        /** 撞击威力：80 +（物攻 − 60）× 0.34 [−14,38] +（速度 − 55）× 0.26 [−8,28] +（等级 − 30）× 0.4 [0,12]；贯穿 ×0.9；夹 56..175。 */
        ram: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-14, 38))
                .plus(F.stat("speed").minus(55).times(0.26).clamp(-8, 28))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("overrun", text("worldcombat.skill.extremespeed.preference.overrun")), F.const(0.9), F.const(1)))
                .clamp(56, 175).round(1),
            "撞击威力", {
                unit: "威力",
                description: "这一记高速撞击的威力，全族最重；物攻给份量、速度给冲势、等级给底气。贯穿式为换位让出一成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：5.2 +（速度 − 55）× 0.03 [−0.7,2.0] +（等级 − 30）× 0.02 [0,0.8]；夹 4.6..7.6。 */
        burst: formula(
            F.base(5.2).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.7, 2.0))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.8)).clamp(4.6, 7.6).round(2),
            "冲刺距离", {
                unit: "格",
                description: "这一记最远冲到哪里，也是本招的实际射程来源，全族最长；腿快、等级高的个体冲得更远。"
            }),
        /** 每刻位移：1.4 +（速度 − 55）× 0.008 [−0.2,0.7]；夹 1.1..2.4。 */
        pace: formula(
            F.base(1.4).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.7)).clamp(1.1, 2.4).round(2),
            "冲刺速度", { unit: "格/刻", description: "每刻前进的距离，全族最快；快到中间过程读不出来，这就是「神速」。" }),
        /** 判定半径：0.50 +（身高 − 1.4）× 0.12 [−0.08,0.3]；夹 0.42..0.85。 */
        collisionRadius: formula(
            F.base(0.50).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.42, 0.85).round(2),
            "判定半径", { unit: "格", description: "高速撞上活体的横向判定半径；身板越大扫得越宽。" }),
        /** 顶开距离：0.5 +（物攻 − 60）× 0.005 [−0.12,0.45] +（体重 − 50）× 0.003 [−0.08,0.5]；夹 0.25..1.6。 */
        push: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.12, 0.45))
                .plus(F.body("weight").minus(50).times(0.003).clamp(-0.08, 0.5)).clamp(0.25, 1.6).round(2),
            "顶开距离", { unit: "格", description: "撞实后把目标沿冲刺方向顶开多远；物攻越高、身体越沉顶得越远，全族最强。" }),
        /** 穿过距离：1.2 +（速度 − 55）× 0.01 [−0.2,0.8] +（体重 − 50）× 0.002 [−0.05,0.4]；贯穿 ×1，重撞 ×0；夹 0..2.6。 */
        carry: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.8))
                .plus(F.body("weight").minus(50).times(0.002).clamp(-0.05, 0.4))
                .times(F.when(F.pref("overrun", text("worldcombat.skill.extremespeed.preference.overrun")), F.const(1), F.const(0)))
                .clamp(0, 2.6).round(2),
            "穿过距离", {
                unit: "格",
                description: "贯穿式在撞中之后还能从对方身上再冲多远（停在它身后）；重撞式为 0，撞中即停。"
            }),
        /** 残影数量：6 +（速度 − 55）× 0.12 [−1,8]；夹 4..14。 */
        wake: formula(
            F.base(6).plus(F.stat("speed").minus(55).times(0.12).clamp(-1, 8)).clamp(4, 14).round(0),
            "残影数量", {
                unit: "道",
                description: "身后留下的残影道数，也直接驱动画面的发射量；速度越快残影越密。"
            }),
        /** 起手：1 −（速度 − 55）× 0.01 [−0.5,0.8]；夹 0..3 刻。 */
        tempo: seconds(
            F.base(1).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 0.8)).clamp(0, 3).round(0),
            "起手", "从起念到冲出去之间的时间；优先度最高的一招，最低可到 0 刻（提交即冲）。"),
        /** 收招：9 −（速度 − 55）× 0.03 [−1,2] + 贯穿 3；夹 6..14 刻。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("overrun", text("worldcombat.skill.extremespeed.preference.overrun")), F.const(3), F.const(0)))
                .clamp(6, 14).round(0),
            "收招", "冲完落地站稳的时间；它冲得最猛，收招也最久，贯穿式还要再缓一拍。"),
        /** 冷却：44 −（速度 − 55）× 0.15 [−3,6]；夹 30..60 刻。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(55).times(0.15).clamp(-3, 6)).clamp(30, 60).round(0),
            "冷却", "两次神速之间的等待，全族最长；这一记是要挑时机放的，不能连着砸。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(extremespeedId, "ram", {}, { contact: true });

    stages(extremespeedId, [
        { level: 35, values: { ram: 92 } },
        { level: 50, values: { ram: 110, burst: 6.0 } }
    ]);

    describe(extremespeedId, [
        { key: "description.0", values: ["ram", "collisionRadius"] },
        { key: "description.1", values: ["burst", "pace", "push"] },
        { key: "description.2", values: ["carry", "wake"] },
        { key: "overrun.on", values: [], when: function (context) { return read(context.detail.values, ["overrun"]) === true; } },
        { key: "overrun.off", values: [], when: function (context) { return read(context.detail.values, ["overrun"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.burst"] }
    ]);
}
