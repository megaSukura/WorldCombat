/**
 * 空气利刃 / aircutter —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 60／命中 95／PP 25／目标 allAdjacentFoes（一场打两边的对手）／
 *   critRatio 2（高暴击）／非接触、切斩（slicing）、风（wind）（Cobblemon 1.8，114 位学习者）。
 *   原生描述：「用锐利的风切斩对手。容易击中要害。」
 *
 * 翻译：把「锐利的风切斩」落成**一片同时扫过面前的细刃扇**——不是一记远投，而是就地张开到整个
 *   扇区、每个站在扇里的对手各挨一次切割。原生 allAdjacentFoes 的多目标语义因此成为「范围本身」：
 *   范围有多宽、能切到几个人，一眼从画面里的扇面读出来。原生 95% 命中与高暴击沿用共享结算
 *   （暴击率来自 critRatio 2）；本单元只负责把这记轻快、口数多的范围切割做出来。
 *
 * 与同族分开：飞叶快刀是一列叶刃沿窄线连发（单体、连续）；叶刃是贴身的一记重斩（接触、单体、最重）；
 *   气旋攻击是一支远程涡流弹（单体、最远、命中炸环）。空气利刃是唯一**瞬发、宽扇面、同时覆盖多个对手**的
 *   一记轻切割。
 * 与其他风招分开（airslash／gust／twister）：空气斩是一道月牙直线贯穿；空气利刃是一整排细刃横扫一片。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   blade      刃锋威力：特攻定风压得多锐，速度定甩出的冲劲。
 *   reach      扇面半径：特攻与等级决定风刃能扫多远。
 *   span       扇面张角：碰撞箱高度决定个体张开多大（体型）。
 *   thickness  单刃判定：碰撞箱宽度决定每道细刃有多厚。
 *   edges      刃数：速度决定一次张开几道（快则更密）。
 *   shards     风屑量：特攻换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；聚刃式更窄更重、冷却更长。
 *
 * 配置 `focus`（聚刃式）双向取舍：开＝威力 ×1.22、射程 +1，但扇面 ×0.62、刃数 −3、冷却 +5；
 *   关（广扇式，默认）＝扇面全宽、刃数 +3，但威力 ×0.94。切开一片 vs 砍准一记，两向各有局面。
 *
 * 伤害段 `blade` 与参数同名，走共享换算（原生类别 Special，Flying 属性，非接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const aircutterId = "aircutter";
    export const aircutterScene = "world_combat:move_aircutter";
    export const aircutterHitText = "world_combat.move.aircutter.text.hit";
    export const aircutterMissText = "world_combat.move.aircutter.text.miss";
    export const aircutterCritText = "world_combat.move.aircutter.text.crit";
    /** 表现里扇面半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const aircutterReference = 8;

    actionParameters.define(aircutterId, {
        /** 刃锋威力：基础 60，特攻每比 60 多 1 加 0.28（夹 −12..40），速度每比 55 快 1 加 0.1（夹 −4..12）；
         *  聚刃 ×1.22 / 广扇 ×0.94；夹在 46..130。 */
        blade: formula(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.28).clamp(-12, 40))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-4, 12))
                .times(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(1.22), F.const(0.94)))
                .clamp(46, 130).round(1),
            "刃锋威力", {
                unit: "威力",
                description: "一次张开里每道细刃切中那一下的基础威力；特攻决定风压得多锐，速度给出甩开的冲劲。对手特防、相性与暴击在命中时另算。"
            }),
        /** 扇面半径：基础 8 格，特攻每比 60 多 1 加 0.05（夹 −1.5..3），等级 25 起每级 +0.05（夹 0..2.5）；
         *  聚刃 +1；夹在 6..12。它也是本招的实际射程。 */
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 3))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2.5))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(1), F.const(0)))
                .clamp(6, 12).round(2),
            "扇面半径", {
                unit: "格",
                description: "细刃从施法者张开扫到多远；特攻与等级决定风撑到哪才散。它也是本招的实际射程。"
            }),
        /** 扇面张角：基础 92°，碰撞箱每比 1.4 高 1 格加 22°（夹 −14..34）；聚刃 ×0.62 / 广扇 ×1；夹在 45..150°。 */
        span: formula(
            F.base(92).plus(F.body("height").minus(1.4).times(22).clamp(-14, 34))
                .times(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(0.62), F.const(1)))
                .clamp(45, 150).round(0),
            "扇面张角", {
                unit: "度",
                description: "一口气张开的扇形角度；个头越大的个体张得越开，覆盖前排越多，聚刃式则收成一条窄扇。"
            }),
        /** 单刃判定：基础 0.34 格，碰撞箱每比 0.9 宽 1 加 0.35（夹 −0.06..0.5）；夹在 0.24..1.0。 */
        thickness: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.35).clamp(-0.06, 0.5)).clamp(0.24, 1.0).round(2),
            "单刃判定", {
                unit: "格",
                description: "每道细刃扫过的横向判定厚度；身体越宽的个体甩出的风刃越厚，越不容易从缝里让开。"
            }),
        /** 刃数：基础 7，速度每比 55 快 1 加 0.12（夹 −2..5）；聚刃 −3 / 广扇 +3；夹在 3..16。 */
        edges: formula(
            F.base(7).plus(F.stat("speed").minus(55).times(0.12).clamp(-2, 5))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(-3), F.const(3)))
                .clamp(3, 16).round(0),
            "刃数", {
                unit: "道",
                description: "一次张开里同时甩出的细刃数量；速度越快张得越密，广扇式更多、聚刃式更少。它也驱动画面密度。"
            }),
        /** 风屑量：基础 22，特攻每比 60 多 1 加 0.22（夹 −6..20）；夹在 14..56。 */
        shards: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-6, 20)).clamp(14, 56).round(0),
            "风屑量", {
                unit: "片",
                description: "细刃扫过目标时卷起的风屑数量，由特攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：基础 5 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；聚刃 +1；夹在 3..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(1), F.const(0))).clamp(3, 9).round(0),
            "起手", "把空气拢成一片细刃、甩出去前的时间；速度越快越短（95% 命中的对位），聚刃式多蓄一拍。"),
        /** 收招：基础 5 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；夹在 3..8。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 8).round(0),
            "收招", "甩完收势的时间；快的个体更干脆。"),
        /** 冷却：基础 18 刻，速度每比 55 快 1 减 0.03（夹 −3..5）；聚刃 +5；夹在 12..30。 */
        recharge: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 5))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.aircutter.preference.focus")), F.const(5), F.const(0))).clamp(12, 30).round(0),
            "冷却", "两次空气利刃之间的等待；PP 25 的手感，速度越快回得越快，聚刃式缓得更久。"),
        /** 一次张开最多切中几个：固定 4（几何与协议常量）。超过的对手不结算，画面仍画满扇面。 */
        maxTargets: hidden(4)
    });

    defineDamage(aircutterId, "blade", { rationale: "细刃的切斩；与原生一致走特殊类别，不改变减伤规则。" }, { slice: true });

    stages(aircutterId, [
        { level: 36, values: { blade: 76, reach: 9, edges: 10 } }
    ]);

    describe(aircutterId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["reach", "span", "thickness"] },
        { key: "description.2", values: ["edges", "shards"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade", "tier.0.reach", "tier.0.edges"] }
    ]);
}
