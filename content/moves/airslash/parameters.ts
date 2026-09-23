/**
 * 空气斩 / airslash —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 75／命中 95／PP 15／目标单体／非接触、切斩（slicing）、可打远（distance）／
 *   30% 畏缩（Cobblemon 1.8，121 位直接学习者）。原生描述：「用连天空也能劈开的空气之刃进行攻击，有时会使对手畏缩。」
 *
 * 翻译：把「劈开天空的空气之刃」落成一道**笔直、极快、能切穿成排目标的月牙**——把空气压成薄薄一条甩出去，
 * 一路切开沿途的敌人而不停在谁身上；它没有重量、不受重力，所以能斩到空中的对手，也是本组打得最远的一击。
 * 原生的 95% 命中落成「飞行极快、出手有短起手」：对手在起手窗口里移开原本的位置就会落空。
 * 原生的 30% 畏缩是刃风扫过的失衡：被切中的目标有概率一滞。
 *
 * 与同族分开：神通力看不见、在一点上延迟合拢；回旋踢贴着自己转一圈；尖刺臂是贴身挥击并在地上留刺。
 *   空气斩是唯一**沿着一条直线穿透、还能斩到空中目标**的那记远程切割。
 * 与既有切割招分开（aquacutter／psychocut）：水波刀是加压水线、切中把目标淋湿；精神利刃会拐弯、命中切出十字；
 *   空气斩笔直不拐弯、不附加状态，只把一整条线上的敌人切开并几率打懵。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   blade       刃锋威力：特攻定空气压得多实，速度定甩出的冲劲。
 *   reach       飞行距离：等级与特攻决定刃能飞多远不散，也是实际射程来源。
 *   flight      飞行速度：速度决定刃飞多快（快则命中窗口更短、更难躲）。
 *   radius      刃身判定：碰撞箱高度决定月牙多宽（也决定能切到多少人）。
 *   pierce      贯穿目标：特攻决定一条线上最多切开几个。
 *   flinchChance 畏缩几率：原生 30% 起，特攻再抬一档。
 *   flinchTicks 畏缩持续。
 *   shards      刃屑量：特攻与等级换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；利刃式以更窄的判定与更长的冷却换更快的飞行与多一个贯穿。
 *
 * 配置 `razor`（利刃式）双向取舍：开＝飞行 ×1.15、贯穿 +1、射程 ×1.05，但刃身 ×0.85、威力 ×0.94、畏缩 ×0.9、冷却 +5；
 *   关（阔风式，默认）＝威力 ×1.10、刃身 ×1.15、畏缩更稳，但飞行更慢、贯穿少一个。切一排 vs 砍一记重的，两向各有局面。
 *
 * 伤害段 `blade` 与参数同名，走共享换算（原生类别 Special，Flying 属性，无接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const airslashId = "airslash";
    export const airslashScene = "world_combat:move_airslash";
    export const airslashFlinchEffect = "world_combat:airslash_flinch";
    export const airslashHitText = "world_combat.move.airslash.text.hit";
    export const airslashMissText = "world_combat.move.airslash.text.miss";
    export const airslashFlinchText = "world_combat.move.airslash.text.flinch";
    /** 表现里刃身判定的参考半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const airslashReference = 0.36;

    actionParameters.define(airslashId, {
        /** 直伤按本招的覆盖与附加收益调校；成长以显式设计基值计算。 */
        blade: formula(
            F.base(56).plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-10, 24))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-3, 8))
                .times(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(0.94), F.const(1.10)))
                .clamp(40, 98).round(1),
            "刃锋威力", {
                base: 56, unit: "威力",
                description: "空气之刃切中那一下的基础威力；特攻决定空气压得多实，速度让它更锋利。对手特防、相性与暴击在命中时另算。"
            }),
        /** 飞行距离：基础 11 格，特攻每比 60 多 1 加 0.05（夹 −2..4），等级每 1 级加 0.06（夹 0..3）；
         *  利刃 ×1.05 / 阔风 ×0.96；夹在 8..16。它也是本招实际射程。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .times(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(1.05), F.const(0.96)))
                .clamp(8, 16).round(1),
            "飞行距离", {
                unit: "格",
                description: "空气之刃从施法者出发能飞多远；特攻与等级决定它撑到哪才散。它也是本招的实际射程。"
            }),
        /** 飞行速度：基础 0.95 格/刻，速度每比 60 快 1 加 0.006（夹 −0.2..0.4）；利刃 ×1.15 / 阔风 ×0.90；夹在 0.6..1.5。 */
        flight: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.4))
                .times(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(1.15), F.const(0.90)))
                .clamp(0.6, 1.5).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "空气之刃每刻飞行多少；速度越快，对手能走位让开的窗口越短。利刃式掠得更急，阔风式沉一点。"
            }),
        /** 刃身判定：基础 0.36 格，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.05..0.24）；利刃 ×0.85 / 阔风 ×1.15；夹在 0.26..0.7。 */
        radius: formula(
            F.base(0.36).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.24))
                .times(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(0.85), F.const(1.15)))
                .clamp(0.26, 0.7).round(2),
            "刃身判定", {
                unit: "格",
                description: "月牙扫过的横向判定半径；个头越高大，刃身越宽，越不容易从旁边让开。"
            }),
        /** 贯穿目标：基础 1（额外切穿 1 个），特攻每比 60 多 1 加 0.012（夹 0..1.5）；利刃 +1 / 阔风 −0.5；夹在 0..4。 */
        pierce: formula(
            F.base(1).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 1.5))
                .plus(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(1), F.const(-0.5)))
                .clamp(0, 4).round(0),
            "贯穿目标", {
                unit: "个",
                description: "这一刀在一条线上最多额外切开几个敌人；特攻越高、风压越整，越能一刀穿透成排目标。"
            }),
        /** 畏缩几率：基础 0.30，特攻每比 60 多 1 加 0.0012（夹 −0.05..0.12）；利刃 ×0.9；夹在 0.16..0.46。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.05, 0.12))
                .times(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(0.9), F.const(1))).clamp(0.16, 0.46).round(3),
            "畏缩几率", "被刃风扫中的畏缩几率（原生 30%）；特攻越高越容易让对手一滞，阔风式更稳。"),
        /** 畏缩持续：基础 12 刻，利刃 −2；夹在 8..20 刻。 */
        flinchTicks: seconds(
            F.base(12).plus(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(-2), F.const(0))).clamp(8, 20).round(0),
            "畏缩持续", "被切懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 刃屑量：基础 24，特攻每比 60 多 1 加 0.25（夹 −6..20）；夹在 14..60。 */
        shards: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-6, 20)).clamp(14, 60).round(0),
            "刃屑量", {
                unit: "片",
                description: "被切开的空气卷起的碎片数量，也驱动表现密度；特攻越高越密。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 13).round(0),
            "起手", "把空气拢成刃、甩出去前的蓄势；速度越快越短，对手能走位的窗口也越短。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "甩出后收势的时间；速度越快越利落。"),
        /** 冷却：基础 26 刻，速度每比 60 快 1 减 0.04（夹 −4..6）；利刃 +5；夹在 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("razor", text("worldcombat.skill.airslash.preference.razor")), F.const(5), F.const(0))).clamp(18, 40).round(0),
            "冷却", "两次空气斩之间的等待；速度越快回得越快，利刃式缓得更久。")
    });

    defineDamage(airslashId, "blade", { rationale: "风刃的切斩；与原生一致走特殊类别，不改变减伤规则。" }, { slice: true });

    stages(airslashId, [
        { level: 40, values: { blade: 64, reach: 12 } }
    ]);

    describe(airslashId, [
        { key: "description.0", values: ["blade","radius"] },
        { key: "description.1", values: ["reach", "flight", "pierce"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "description.3", values: ["pref.razor"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade", "tier.0.reach"] }
    ]);
}
