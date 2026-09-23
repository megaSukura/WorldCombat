/**
 * 投球 / barrage 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown 1.8.0+1.21.1）：**一般**／物理／威力 15／命中 85／PP 20／**不接触**／单体／
 *   连续 2～5 次（`multihit: [2, 5]`）／带 `bullet`（子弹）flag；无次要效果。描述「向对手投掷圆形物体进行攻击，
 *   连续攻击２～５次」。已实装学习者 3（蛋蛋 / 椰蛋树系）。
 *
 * 翻译：把「投掷圆形物体」落成**远处一发接一发抛出圆球**——施法者站在原地，把手里的圆球一个接一个抛出去，
 *   每个球自己飞、自己撞。它是本族唯一的远程招，也是唯一**带物体飞行**的一串；圆球是圆的，所以它天然会
 *   跟世界互动：平投的球撞上墙会弹一下（`bounce` + `restitution`），高抛的球越过掩体落到目标头上。
 *   命中率 85 由散布翻译（球散得开就会漏）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ball      单球威力：物攻定球的分量，等级让投得更熟。
 *   throws    投数：速度定出手多快、等级定耐力，决定这一串最多几球（原生 2～5）。
 *   reach     投得到多远：物攻与等级决定臂力送得多远，也是本招的实际射程来源。
 *   velocity  球速：速度决定球飞得多快。
 *   arc       弧坠：等级决定抛得多高（高抛式更陡）。
 *   spread    散布：速度决定球散多开——这就是 85 命中的翻译。
 *   radius    球判定：体型高度决定球的大小。
 *   gap       间隔：速度决定一球接一球多密。
 *   chips     球屑点数：物攻换算的碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度定节奏，高抛式更费一点冷却。
 *
 * 配置 `lob`（高抛式）双向取舍（默认开）：
 *   开（高抛式，默认）＝弧线越过掩体、落点更靠数据瞄准；代价是球飞得慢（目标容易走位躲开）、散布更大、单球 ×0.9、冷却 +2。
 *   关（平投式）＝球直、快、散布小、单球 ×1.15；代价是会被墙与掩体挡住（撞上只弹一下，不伤人），射程内没有掩体时明显更强。
 *
 * 伤害段 `ball` 与参数同名；走共享换算（原始类别 Physical），带 `bullet` flag；对手物防、相性与暴击在每球命中时另算。
 */
namespace PokemonSkills {
    export const barrageId = "barrage";
    export const barrageScene = "world_combat:move_barrage";
    export const barrageTallyText = "world_combat.move.barrage.text.tally";
    export const barrageOutText = "world_combat.move.barrage.text.out";

    actionParameters.define(barrageId, {
        /** 单球威力：15 + 物攻偏移[−4,13]×0.14 + 等级(≥20)偏移[0,7]×0.28；高抛 ×0.9 / 平投 ×1.15；夹 8..30。 */
        ball: formula(
            F.base(15).plus(F.stat("attack").minus(55).times(0.14).clamp(-4, 13))
                .plus(F.level().minus(20).times(0.28).clamp(0, 7))
                .times(F.when(F.pref("lob"), F.const(0.9), F.const(1.15)))
                .clamp(8, 30).round(1),
            "单球威力", {
                unit: "威力",
                description: "每一个球各自结算的威力；物攻越高投得越沉。平投式更重、高抛式略轻。对手物防、相性与暴击在每球命中时另算。"
            }),
        /** 投数：2 + 速度偏移[0,2.0]×0.022 + 等级(≥20)偏移[0,1.2]×0.025；向下取整；夹 2..5。 */
        throws: formula(
            F.base(2)
                .plus(F.stat("speed").minus(55).times(0.022).clamp(0, 2.0))
                .plus(F.level().minus(20).times(0.025).clamp(0, 1.2))
                .floor().clamp(2, 5),
            "投数", {
                unit: "个",
                description: "这一串最多抛出几个球（原生 2～5）；速度定出手速度、等级定耐力。"
            }),
        /** 射程：9 + 物攻偏移[−1.5,3]×0.04 + 等级(≥20)偏移[0,2]×0.06；夹 7..13。 */
        reach: formula(
            F.base(9).plus(F.stat("attack").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.level().minus(20).times(0.06).clamp(0, 2))
                .clamp(7, 13).round(1),
            "射程", {
                unit: "格",
                description: "球能投到多远；物攻与等级越高送得越远，也是本招的实际射程来源。"
            }),
        /** 球速：1.5 + 速度偏移[−0.15,0.45]×0.008；高抛 ×0.8 / 平投 ×1.15；夹 1.0..2.4。 */
        velocity: formula(
            F.base(1.5).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.15, 0.45))
                .times(F.when(F.pref("lob"), F.const(0.8), F.const(1.15)))
                .clamp(1.0, 2.4).round(2),
            "球速", {
                unit: "格/刻",
                description: "球飞行的速度；速度快的个体投得更急。平投式更快、高抛式更慢（目标更容易走位躲开）。"
            }),
        /** 弧坠：0.045 + 等级(≥20)偏移[0,0.01]×0.0004；高抛 ×1.5 / 平投 ×0.7；夹 0.02..0.09。 */
        arc: formula(
            F.base(0.045).plus(F.level().minus(20).times(0.0004).clamp(0, 0.01))
                .times(F.when(F.pref("lob"), F.const(1.5), F.const(0.7)))
                .clamp(0.02, 0.09).round(3),
            "弧坠", {
                unit: "格/刻²",
                description: "球在空中下坠的强度；等级让抛得更准。高抛式弧更陡、越过掩体，平投式几乎是一条直线。"
            }),
        /** 散布：2.5 + 速度偏移[0,2]×0.02；高抛 ×1.5 / 平投 ×0.7；夹 1.2..6。 */
        spread: formula(
            F.base(2.5).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2))
                .times(F.when(F.pref("lob"), F.const(1.5), F.const(0.7)))
                .clamp(1.2, 6).round(1),
            "散布", {
                unit: "°",
                description: "每个球投出时的随机偏角；速度快的个体投得散。球散得开就会漏，这就是 85 命中的翻译；平投式更收、高抛式更散。"
            }),
        /** 球判定：0.2 + 身高偏移[−0.03,0.12]×0.05；夹 0.16..0.34。 */
        radius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.12)).clamp(0.16, 0.34).round(2),
            "球判定", {
                unit: "格",
                description: "球飞行与命中的判定大小；体型越高球越大。画出的球大小与它一致。"
            }),
        /** 间隔：3 − 速度偏移[−0.7,1.0]×0.02；夹 2..5。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.0)).clamp(2, 5).round(0),
            "间隔", "两个球之间隔多久投出；速度越快投得越密。"),
        /** 球屑点数：14 + 物攻偏移[−3,12]×0.13；夹 10..30。 */
        chips: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.13).clamp(-3, 12)).clamp(10, 30).round(0),
            "球屑点数", {
                unit: "点",
                description: "每个球撞碎时崩出的碎屑数量，由物攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 起手：6 − 速度偏移[−0.7,1.3]×0.02；夹 4..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.3)).clamp(4, 9).round(0),
            "起手", "抓球到投出第一个的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−0.6,1.2]×0.015；夹 3..9。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 9).round(0),
            "收招", "这一串投完收手的时间；速度越快收得越快。"),
        /** 冷却：25 − 速度偏移[−3,4]×0.05 + 高抛 2 / 平投 −2；夹 14..36。 */
        recharge: seconds(
            F.base(25).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("lob"), F.const(2), F.const(-2)))
                .clamp(14, 36).round(0),
            "冷却", "再抓一串球前等待多久；速度越快回得越快，高抛式更费、平投式更省。")
    });

    stages(barrageId, [
        { level: 20, values: { ball: 18, throws: 3 } },
        { level: 36, values: { ball: 23, reach: 11 } },
        { level: 52, values: { ball: 27, velocity: 1.8 } }
    ]);

    defineDamage(barrageId, "ball", {}, { flags: { bullet: true } });

    describe(barrageId, [
        { key: "description.0", values: ["ball","throws"] },
        { key: "description.1", values: ["gap", "reach", "velocity", "spread"] },
        { key: "description.2", values: ["arc", "radius"] },
        { key: "description.out", values: [] },
        { key: "lob.on", values: [], when: function (context) { return read(context.detail.values, ["lob"]) === true; } },
        { key: "lob.off", values: [], when: function (context) { return read(context.detail.values, ["lob"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ball", "tier.0.throws"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ball", "tier.1.reach"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.ball", "tier.2.velocity"] }
    ]);
}
