/**
 * 连续拳 / cometpunch 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown 1.8.0+1.21.1）：**一般**／物理／威力 18／命中 85／PP 15／接触／单体／
 *   连续 2～5 次（`multihit: [2, 5]`）／带 `punch`（拳）flag。描述「用拳头怒涛般的殴打对手……连续攻击２～５次」。
 *   已实装学习者 9（快拳郎 / 袋兽 / 芭瓢虫系等）。
 *
 * 翻译：把「怒涛般的连拳」落成**站定、双拳朝身前一片密集直击**——施法者扎住脚步，一双拳头一下接一下砸出去，
 *   拳影在身前叠成一片白光；本族的单拳最重（原生 18），但拳数靠物攻与耐力堆。它是唯一的「拳」招，带有 punch
 *   flag，会和铁拳一类的拳击加成自然联动。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   punch      单拳威力：物攻定拳头的份量，等级让出拳更老练（本族最重的一档）。
 *   punches    拳数：物攻定收拳多快、等级定耐力，决定这一串最多几拳（原生 2～5）。
 *   reach      拳够得到的距离：身高定臂长、身宽定肩膀展幅，也是本招的实际射程来源。
 *   cone       扇面张角：身宽决定双拳能罩开多宽（乱打式才有）。
 *   maxTargets 一记乱拳最多打到几个：身宽决定能不能盖到并排的第二个。
 *   push       拳压顶退：物攻决定每拳把人推开多远。
 *   gap        拳与拳的间隔：速度决定出拳多密。
 *   accuracy   每拳命中率：速度提高它（原生 85%）。
 *   sparks     拳花点数：物攻换算的拳风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度定节奏，乱打式更费一点冷却。
 *
 * 配置 `scatter`（乱打式）双向取舍（默认关，即聚焦式）：
 *   开＝乱打：每拳散着砸向身前一片（`cone` 扇面），能同时盖到并排的第二个人（`maxTargets` 随身宽 1→2）；
 *     代价是单拳 ×0.85、顶退 ×0.6、拳数收在 5、冷却 +2 刻。
 *     适用：被围住、或目标身边还站着同伴。
 *   关（聚焦式，原生式）＝全部砸在同一个点上：单拳 ×1.2、顶退 ×1.4；代价是拳数收在 4、只打一个目标。
 *     适用：打单个厚目标，要单拳份量。
 *
 * 伤害段 `punch` 与参数同名；走共享换算（原始类别 Physical），带接触与 punch flag；对手物防、相性与暴击在每拳命中时另算。
 */
namespace PokemonSkills {
    export const cometpunchId = "cometpunch";
    export const cometpunchScene = "world_combat:move_cometpunch";
    export const cometpunchTallyText = "world_combat.move.cometpunch.text.tally";
    export const cometpunchMissText = "world_combat.move.cometpunch.text.miss";

    actionParameters.define(cometpunchId, {
        /** 单拳威力：18 + 物攻偏移[−4,16]×0.18 + 等级(≥25)偏移[0,8]×0.32；乱打 ×0.85 / 聚焦 ×1.2；夹 10..40。 */
        punch: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.18).clamp(-4, 16))
                .plus(F.level().minus(25).times(0.32).clamp(0, 8))
                .times(F.when(F.pref("scatter"), F.const(0.85), F.const(1.2)))
                .clamp(10, 40).round(1),
            "单拳威力", {
                unit: "威力",
                description: "每一拳各自结算的威力；物攻越高砸得越沉。本族单拳最重的一档。聚焦式更重、乱打式更轻。对手物防、相性与暴击在每拳命中时另算。"
            }),
        /** 拳数：2 + 物攻偏移[0,2.2]×0.025 + 等级(≥25)偏移[0,1]×0.02；向下取整；乱打上限 5 / 聚焦上限 4；夹 2..上限。 */
        punches: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.025).clamp(0, 2.2))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor().clamp(2, F.when(F.pref("scatter"), F.const(5), F.const(4))),
            "拳数", {
                unit: "拳",
                description: "这一串最多砸几拳（原生 2～5）；物攻定收拳速度、等级定耐力。乱打式可到 5 拳，聚焦式收在 4 拳。"
            }),
        /** 够得到的距离：2.7 + 身高偏移[−0.2,0.7]×0.6 + 身宽偏移[−0.1,0.4]×0.3；夹 2.2..3.6。 */
        reach: formula(
            F.base(2.7).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.2, 0.7))
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.4))
                .clamp(2.2, 3.6).round(2),
            "够得到的距离", {
                unit: "格",
                description: "拳头能够到多远的对手；身高定臂长、身宽定肩膀展幅，也是本招的实际射程来源。"
            }),
        /** 扇面张角：乱打式 16 + 身宽偏移[0,14]×12，夹 6..32；聚焦式为 0。 */
        cone: formula(
            F.when(F.pref("scatter"),
                F.base(16).plus(F.body("width").minus(0.9).times(12).clamp(0, 14)).clamp(6, 32).round(1),
                F.const(0)),
            "扇面张角", {
                unit: "°",
                description: "乱打式每一拳散开的身前扇面有多宽；身宽越大罩得越开。聚焦式为 0，全部砸在同一个点。"
            }),
        /** 一记乱拳最多打到几个：乱打式 1 + 身宽偏移[0,1]×1.2，向下取整，夹 1..2；聚焦式为 1。 */
        maxTargets: formula(
            F.when(F.pref("scatter"),
                F.base(1).plus(F.body("width").minus(1.0).times(1.2).clamp(0, 1)).floor().clamp(1, 2),
                F.const(1)),
            "一记乱拳最多打到", {
                unit: "个",
                description: "乱打式的一记乱拳最多同时砸到几个非友方；身宽越大越能盖到并排的第二个。聚焦式只打一个。"
            }),
        /** 拳压顶退：0.28 + 物攻偏移[−0.05,0.4]×0.003；乱打 ×0.6 / 聚焦 ×1.4；夹 0.1..0.9。 */
        push: formula(
            F.base(0.28).plus(F.stat("attack").minus(55).times(0.003).clamp(-0.05, 0.4))
                .times(F.when(F.pref("scatter"), F.const(0.6), F.const(1.4)))
                .clamp(0.1, 0.9).round(2),
            "拳压顶退", {
                unit: "格",
                description: "每一拳把目标沿出拳方向顶开多远；物攻越大顶得越狠。聚焦式顶得更远、乱打式摊薄。"
            }),
        /** 间隔：3 − 速度偏移[−0.7,1.0]×0.02；夹 2..5。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.0)).clamp(2, 5).round(0),
            "间隔", "两拳之间隔多久；速度越快出拳越密，这也是「怒涛般」的来源。"),
        /** 每拳命中率：0.85 + 速度偏移[−0.03,0.06]×0.001；夹 0.72..0.95。 */
        accuracy: percent(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.06)).clamp(0.72, 0.95).round(3),
            "每拳命中率", "每一拳独立掷的命中率（原生 85% 起）；速度提高它。擦空一拳这串就停。"),
        /** 拳花点数：14 + 物攻偏移[−3,12]×0.14；夹 10..32。 */
        sparks: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.14).clamp(-3, 12)).clamp(10, 32).round(0),
            "拳花点数", {
                unit: "点",
                description: "每一拳带起的拳风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：5 − 速度偏移[−0.7,1.3]×0.02；夹 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.3)).clamp(3, 8).round(0),
            "起手", "站位到第一拳砸出的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−0.6,1.2]×0.015；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 9).round(0),
            "收招", "这一串砸完收拳的时间；速度越快收得越快。"),
        /** 冷却：24 − 速度偏移[−3,5]×0.06 + 乱打 2 / 聚焦 −2；夹 15..34。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5))
                .plus(F.when(F.pref("scatter"), F.const(2), F.const(-2)))
                .clamp(15, 34).round(0),
            "冷却", "再起一串连拳前等待多久；速度越快回得越快，乱打式更费、聚焦式更省。")
    });

    stages(cometpunchId, [
        { level: 25, values: { punch: 22, punches: 3 } },
        { level: 44, values: { punch: 28, reach: 3.2 } }
    ]);

    defineDamage(cometpunchId, "punch", {}, { contact: true, flags: { punch: true } });

    describe(cometpunchId, [
        { key: "description.0", values: ["punch", "punches"] },
        { key: "description.1", values: ["gap", "reach", "accuracy"] },
        { key: "description.2", values: ["cone", "maxTargets", "push"] },
        { key: "scatter.on", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) === true; } },
        { key: "scatter.off", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.punch", "tier.0.punches"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.punch", "tier.1.reach"] }
    ]);
}
