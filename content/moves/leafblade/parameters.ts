/**
 * 叶刃 / leafblade —— 参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 90／命中 100／PP 15／目标单体／critRatio 2（高暴击）／接触（contact）、
 *   切斩（slicing）（Cobblemon 1.8，29 位学习者）。原生描述：「像用剑一般操纵叶片切斩对手。容易击中要害。」
 *
 * 翻译：把「像用剑一般操纵叶片」落成一记**贴身的重斩**——施法者握着一片叶当作剑，一步压上、横挥一次，
 *   把主目标整个切开，刃风还扫到近旁的旁人。它是四记里唯一接触、单体、最重的一击；高暴击沿用原生
 *   critRatio 2 的共享结算。刀刃切得够深，主目标的防御被削掉一档（公共能力阶梯，对宝可梦与普通生物同样生效），
 *   为本轮交战留一个持久的裂口。
 *
 * 与同族分开：空气利刃是瞬发宽扇面（范围、轻）；飞叶快刀是窄带连发（连续、多波）；气旋攻击是远程涡流弹（最远）。
 *   叶刃是唯一**必须贴身、一次重斩、并把切口留在对手身上**的一记。
 * 与近战切割招分开（slash／xscissor／nightslash）：居合斩是贴地宽弧并割草；十字剪两拍合拢；暗袭要害位移到背后；
 *   叶刃站定一次横挥，重、单体、命中削防。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   edge       刃锋威力：物攻定斩得多重，等级定经验带来的收势。
 *   reach      贴身距离：速度决定压上的一步能迈多远。
 *   span       挥斩张角：碰撞箱宽度决定个体挥出的弧有多大。
 *   echo       波及比例：刃风扫到旁人时吃几成。
 *   sever      削防档数：双手式更深（固定 +1）。
 *   shards     叶屑量：物攻换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；双手式更慢更重、冷却更长。
 *
 * 配置 `twohand`（双手式）双向取舍：开＝威力 ×1.2、挥斩张角 ×1.1、削防 +1，但起手 +3、收招 +2、冷却 +6；
 *   关（单手式，默认）＝更快、冷却 −4、波及稍窄，但威力 ×0.95。一击更重 vs 更利落，各有局面。
 *
 * 伤害段 `edge` 与参数同名，走共享换算（原生类别 Physical，Grass 属性，接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const leafbladeId = "leafblade";
    export const leafbladeScene = "world_combat:move_leafblade";
    export const leafbladeCutText = "world_combat.move.leafblade.text.cut";
    export const leafbladeSeverText = "world_combat.move.leafblade.text.sever";
    export const leafbladeMissText = "world_combat.move.leafblade.text.miss";
    export const leafbladeCritText = "world_combat.move.leafblade.text.crit";
    /** 表现里刃风半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const leafbladeReference = 3;

    actionParameters.define(leafbladeId, {
        /** 刃锋威力：基础 90，物攻每比 60 多 1 加 0.5（夹 −18..55），等级 30 起每级 +0.35（夹 −6..20）；
         *  双手 ×1.2；夹在 70..190。 */
        edge: formula(
            F.base(90).plus(F.stat("attack").minus(60).times(0.5).clamp(-18, 55))
                .plus(F.level().minus(30).times(0.35).clamp(-6, 20))
                .times(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(1.2), F.const(0.95)))
                .clamp(70, 190).round(1),
            "刃锋威力", {
                unit: "威力",
                description: "横挥一次切中那一下的基础威力；物攻决定斩得多重，等级让收势更沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贴身距离：基础 3.0 格，速度每比 55 快 1 加 0.012（夹 −0.3..0.7）；夹在 2.4..4.6。它也是本招实际射程。 */
        reach: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.7)).clamp(2.4, 4.6).round(2),
            "贴身距离", {
                unit: "格",
                description: "压上去、挥出这一刀的距离；速度快的个体能迈得更远。它也是本招的实际射程——叶刃必须贴身。"
            }),
        /** 挥斩张角：基础 118°，碰撞箱每比 0.9 宽 1 加 26°（夹 −10..40）；双手 ×1.1；夹在 80..170°。 */
        span: formula(
            F.base(118).plus(F.body("width").minus(0.9).times(26).clamp(-10, 40))
                .times(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(1.1), F.const(1)))
                .clamp(80, 170).round(0),
            "挥斩张角", {
                unit: "度",
                description: "这一刀扫过的扇形角度；身体越宽的个体挥出的弧越大，越容易顺带扫到旁的敌人。"
            }),
        /** 波及比例：基础 0.42，双手 +0.08 / 单手 −0.06；夹在 0.2..0.65。 */
        echo: formula(
            F.base(0.42).plus(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(0.08), F.const(-0.06)))
                .clamp(0.2, 0.65).round(2),
            "波及比例", {
                unit: "倍",
                description: "刃风扫到近旁其他敌人时吃主伤几成的威力；双手式挥得更开、波及更足。"
            }),
        /** 削防档数：基础 1，双手 +1；向下取整，夹在 1..2。 */
        sever: formula(
            F.base(1).plus(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(1), F.const(0)))
                .floor().clamp(1, 2),
            "削防档数", {
                unit: "级",
                description: "这一刀在主目标身上留下的深口，降低它一档（双手式两档）防御；对宝可梦改原生能力等级、对普通生物落到护甲属性，脱战后同样消退。"
            }),
        /** 叶屑量：基础 18，物攻每比 60 多 1 加 0.3（夹 −4..18）；夹在 12..44。 */
        shards: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.3).clamp(-4, 18)).clamp(12, 44).round(0),
            "叶屑量", {
                unit: "片",
                description: "重斩切中时卷起的叶屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.03（夹 −1..3）；双手 +3；夹在 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 3))
                .plus(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(3), F.const(0))).clamp(5, 14).round(0),
            "起手", "压上、提剑到挥出之间的时间；速度越快越短，双手式蓄得更久。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.02（夹 −1..3）；双手 +2；夹在 5..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(2), F.const(0))).clamp(5, 13).round(0),
            "收招", "收剑的时间；重的挥法收得慢。"),
        /** 冷却：基础 26 刻，速度每比 55 快 1 减 0.04（夹 −3..6）；双手 +6 / 单手 −4；夹在 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.04).clamp(-3, 6))
                .plus(F.when(F.pref("twohand", text("worldcombat.skill.leafblade.preference.twohand")), F.const(6), F.const(-4))).clamp(18, 40).round(0),
            "冷却", "两记重斩之间的等待；PP 15 的代价，双手式缓得更久、单手式回得更快。"),
        /** 一次挥斩最多波及几个旁人：固定 2（几何与协议常量）。 */
        echoCap: hidden(2)
    });

    defineDamage(leafbladeId, "edge", { rationale: "叶刃的重斩；与原生一致接触并带切斩标记。" }, { contact: true, slice: true });

    stages(leafbladeId, [
        { level: 45, values: { edge: 120, sever: 2 } }
    ]);

    describe(leafbladeId, [
        { key: "description.0", values: ["edge", "reach"] },
        { key: "description.1", values: ["span", "echo"] },
        { key: "description.2", values: ["sever", "shards"] },
        { key: "twohand.on", values: [], when: function (context) { return read(context.detail.values, ["twohand"]) === true; } },
        { key: "twohand.off", values: [], when: function (context) { return read(context.detail.values, ["twohand"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.edge", "tier.0.sever"] }
    ]);
}
