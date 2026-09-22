/**
 * 飞叶快刀 / razorleaf —— 参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 55／命中 95／PP 25／目标 allAdjacentFoes（一场打两边的对手）／
 *   critRatio 2（高暴击）／非接触、切斩（slicing）（Cobblemon 1.8，65 位学习者）。
 *   原生描述：「飞出叶片，切斩对手。容易击中要害。」
 *
 * 翻译：把「飞出叶片」落成一列**沿同一条窄带连发的叶刃**——不是一次性的抛掷，而是叶一片接一片地顺着
 *   瞄准方向削出去，每一波扫过窄带里的对手。它连续、贴地、直线，单次轻但会一拍接一拍，站桩的人被反复削。
 *   原生 allAdjacentFoes 的「同时打两边」在这里表现为「窄带里排着几个人就被同一波一起扫到」。
 *   原生 95% 命中落成「叶飞得快、起手极短」；高暴击沿用 critRatio 2 的共享结算。
 *
 * 与同族分开：空气利刃是瞬发、宽扇面的一整片；叶刃是贴身的一记重斩（接触、最重）；气旋攻击是远程单体涡流弹。
 *   飞叶快刀是唯一**沿窄带连续多波齐发**的一记轻叶刃。
 * 与魔法叶分开：魔法叶是一群会拐弯追人的叶、只扑一个对手；飞叶快刀笔直不追、窄带里的人都挨。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   leaf       单波叶刃威力：物攻定叶的锋利，速度定甩出的劲。
 *   waves      波数：等级决定连发几拍。
 *   reach      射程：等级决定叶片能撑多远不落。
 *   spread     窄带半宽：碰撞箱宽度决定叶幕铺多宽。
 *   leafRadius 单片叶判定：碰撞箱高度决定单叶多厚。
 *   leaves     每波叶片量：速度换算，驱动表现密度。
 *   gap        波间隔：速度决定两波之间多快。
 *   tempo／aftercast／recharge：速度定节奏；撒叶式更宽更重、冷却更短。
 *
 * 配置 `broad`（撒叶式）双向取舍：开＝窄带 ×1.8、每波 ×1.15、冷却 −4，但波数 −1；
 *   关（连叶式，默认）＝波数 +1、窄带 ×0.8，冷却 +5，但每波更轻。扫开一片 vs 削穿一列，各有局面。
 *
 * 伤害段 `leaf` 与参数同名，走共享换算（原生类别 Physical，Grass 属性，非接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const razorleafId = "razorleaf";
    export const razorleafScene = "world_combat:move_razorleaf";
    export const razorleafHitText = "world_combat.move.razorleaf.text.hit";
    export const razorleafMissText = "world_combat.move.razorleaf.text.miss";
    export const razorleafCritText = "world_combat.move.razorleaf.text.crit";
    /** 表现里射程的参考值（格）；服务端传 scale = 实际射程 / 这个值。 */
    export const razorleafReference = 9;

    actionParameters.define(razorleafId, {
        /** 单波叶刃威力：基础 16，物攻每比 50 多 1 加 0.09（夹 −5..16），速度每比 55 快 1 加 0.05（夹 −2..6）；
         *  撒叶 ×1.15；夹在 10..34。 */
        leaf: formula(
            F.base(16).plus(F.stat("attack").minus(50).times(0.09).clamp(-5, 16))
                .plus(F.stat("speed").minus(55).times(0.05).clamp(-2, 6))
                .times(F.when(F.pref("broad", text("worldcombat.skill.razorleaf.preference.broad")), F.const(1.15), F.const(1)))
                .clamp(10, 34).round(1),
            "单波叶刃威力", {
                unit: "威力",
                description: "每一波叶刃切中那一下的基础威力；物攻给出叶的锋利，速度给出甩出的劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 波数：基础 3，等级 30 起每级 +0.03（夹 −1..2）；撒叶 −1 / 连叶 +1；向下取整，夹在 2..5。 */
        waves: formula(
            F.base(3).plus(F.level().minus(30).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.razorleaf.preference.broad")), F.const(-1), F.const(1)))
                .floor().clamp(2, 5),
            "波数", {
                unit: "波",
                description: "一次出叶分几波、叶一片接一片削出去；等级高的个体连发更多，连叶式比撒叶式多一波。"
            }),
        /** 射程：基础 9 格，等级 25 起每级 +0.06（夹 −1..2.5）；夹 7..14。它也是本招实际射程。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.06).clamp(-1, 2.5)).clamp(7, 14).round(2),
            "射程", {
                unit: "格",
                description: "叶沿着瞄准方向能撑多远不落；等级越高削得越远，它也是本招的实际射程。"
            }),
        /** 窄带半宽：基础 1.1 格，碰撞箱每比 0.9 宽 1 加 0.5（夹 −0.12..0.8）；撒叶 ×1.8 / 连叶 ×0.8；夹 0.6..3.0。 */
        spread: formula(
            F.base(1.1).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.12, 0.8))
                .times(F.when(F.pref("broad", text("worldcombat.skill.razorleaf.preference.broad")), F.const(1.8), F.const(0.8)))
                .clamp(0.6, 3.0).round(2),
            "窄带半宽", {
                unit: "格",
                description: "叶幕扫过的窄带横向半宽；身体越宽的个体叶幕越宽，撒叶式更宽、连叶式更窄。"
            }),
        /** 单片叶判定：基础 0.26 格，碰撞箱每比 1.4 高 1 加 0.08（夹 −0.04..0.16）；夹在 0.18..0.5。 */
        leafRadius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.04, 0.16)).clamp(0.18, 0.5).round(2),
            "单片叶判定", {
                unit: "格",
                description: "每片叶扫过的横向判定厚度；个头越高的个体甩出的叶越厚，越不容易从缝里让开。"
            }),
        /** 每波叶片量：基础 12，速度每比 55 快 1 加 0.25（夹 −3..10）；夹在 8..28。 */
        leaves: formula(
            F.base(12).plus(F.stat("speed").minus(55).times(0.25).clamp(-3, 10)).clamp(8, 28).round(0),
            "每波叶片量", {
                unit: "片",
                description: "每一波同时飞出的叶片数量，由速度换算；它驱动表现密度，不是独立伤害。"
            }),
        /** 波间隔：基础 4 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；夹在 2..7。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(2, 7).round(0),
            "波间隔", "两波叶刃之间隔多久；速度越快连得越紧，站桩的人被削得越密。"),
        /** 起手：基础 6 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；撒叶 +1；夹在 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.razorleaf.preference.broad")), F.const(1), F.const(0))).clamp(4, 10).round(0),
            "起手", "甩出第一波叶前的时间；速度越快越短（95% 命中的对位）。"),
        /** 收招：基础 5 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；夹在 3..8。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 8).round(0),
            "收招", "最后一波叶收势的时间；快的个体更干脆。"),
        /** 冷却：基础 20 刻，速度每比 55 快 1 减 0.03（夹 −3..5）；撒叶 −4 / 连叶 +5；夹在 14..32。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 5))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.razorleaf.preference.broad")), F.const(-4), F.const(5))).clamp(14, 32).round(0),
            "冷却", "两轮飞叶之间的等待；PP 25 的手感，撒叶式回得更快、连叶式连发更多但缓得更久。")
    });

    defineDamage(razorleafId, "leaf", { rationale: "叶刃的切斩；与原生一致走物理类别，不改变减伤规则。" }, { slice: true });

    stages(razorleafId, [
        { level: 30, values: { leaf: 20, waves: 4, reach: 10 } }
    ]);

    describe(razorleafId, [
        { key: "description.0", values: ["leaf", "waves"] },
        { key: "description.1", values: ["reach", "spread", "gap"] },
        { key: "description.2", values: ["leafRadius", "leaves"] },
        { key: "broad.on", values: [], when: function (context) { return read(context.detail.values, ["broad"]) === true; } },
        { key: "broad.off", values: [], when: function (context) { return read(context.detail.values, ["broad"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.leaf", "tier.0.waves", "tier.0.reach"] }
    ]);
}
