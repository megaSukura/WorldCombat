/**
 * 树叶 / leafage —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass／物理／威力 40／命中 100／PP 40／优先度 0／单体，
 *   非接触（protect/mirror/metronome），无次要效果。描述「将叶片打向对手，进行攻击。」学习者 19。
 *
 * 翻译：把「把叶片打向对手」落成**随手撒出一把嫩叶**——叶子从身上抖下来、沿瞄准方向张成一个小扇面，
 *   各走一条小弧；最先扎中目标的那一片算数，其余的旋落在落点。它是草系里最便宜、最快的一记：
 *   起手极短、回得也快，可以一记接一记地撒，代价是单片轻、射程近。
 *   原生 100% 命中落成「叶多、扇面宽，走位也难完全躲开」；PP 40 的廉价手感落成短冷却。
 *
 * 与同族分开：飞叶快刀是沿一条窄带连发多波（站桩连削）；魔法叶是会拐弯追人、只扑一个；
 *   叶刃是贴身一记最重的重斩；飞叶风暴是留在场上的大范围。只有树叶是**一把随手撒出的短弧叶**。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   toss       单片命中威力：物攻定叶的锋利，速度定甩出的劲；重叶式 ×1.3。
 *   count      一把几片叶：速度换算；重叶式少而大。
 *   reach      撒得到多远：等级与物攻决定；重叶式稍远。它也是本招实际射程。
 *   velocity   叶的飞行速度：速度。
 *   leafRadius 单叶判定：碰撞箱高度；重叶式更大。
 *   spread     扇面张角：碰撞箱宽度；重叶式收窄。
 *   tempo／aftercast／recharge：速度定节奏；重叶式更慢更久。
 *
 * 配置 `heavy`（重叶式）双向取舍（默认关，疾撒式）：
 *   开（重叶式）：单叶 ×1.3、判定 ×1.35、射程 ×1.12，但叶数 ×0.55、起手 +1 刻、冷却 +5 刻——少而重、更远。
 *   关（疾撒式）：叶多、出手快、回得快，但单叶轻、判定窄、射程近——用数量压住走位。
 *
 * 伤害段 `toss` 与参数同名，走共享换算（原生类别 Physical，Grass 属性，非接触）。
 */
namespace PokemonSkills {
    export const leafageId = "leafage";
    export const leafageScene = "world_combat:move_leafage";
    export const leafageHitText = "world_combat.move.leafage.text.hit";
    export const leafageMissText = "world_combat.move.leafage.text.miss";
    /** 表现里单叶判定的参考值（格）；服务端传 scale = 实际判定 / 这个值。 */
    export const leafageReference = 0.22;

    actionParameters.define(leafageId, {
        /** 单片命中威力：基础 26，物攻每比 50 多 1 加 0.08（夹 −5..14），速度每比 50 快 1 加 0.05（夹 −1..5）；
         *  重叶 ×1.3；夹在 14..42。 */
        toss: formula(
            F.base(26)
                .plus(F.stat("attack").minus(50).times(0.08).clamp(-5, 14))
                .plus(F.stat("speed").minus(50).times(0.05).clamp(-1, 5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(1.3), F.const(1)))
                .clamp(14, 42).round(1),
            "单片威力", {
                unit: "威力",
                description: "最先扎中的那一片叶造成的威力；物攻给出叶的锋利，速度给出甩出的劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 叶数：基础 6，速度每比 50 快 1 加 0.14（夹 −2..6）；重叶 ×0.55；向下取整，夹在 3..10。 */
        count: formula(
            F.base(6).plus(F.stat("speed").minus(50).times(0.14).clamp(-2, 6))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(0.55), F.const(1)))
                .floor().clamp(3, 10),
            "叶数", {
                unit: "片",
                description: "一把撒出几片叶；速度越快撒得越多，扇面越宽、越容易兜住会走位的对手。它同时驱动画面里的叶量。"
            }),
        /** 射程：基础 7 格，等级 20 起每级 +0.05（夹 −1..2），物攻每比 50 多 1 加 0.012（夹 −0.5..1）；重叶 ×1.12；夹 5..12。 */
        reach: formula(
            F.base(7)
                .plus(F.level().minus(20).times(0.05).clamp(-1, 2))
                .plus(F.stat("attack").minus(50).times(0.012).clamp(-0.5, 1))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(1.12), F.const(1)))
                .clamp(5, 12).round(1),
            "射程", {
                unit: "格",
                description: "叶片能撒到多远的目标；等级与物攻越高撒得越远，重叶式更远。它也是本招的实际射程。"
            }),
        /** 叶速：基础 1.15，速度每比 50 快 1 加 0.008（夹 −0.15..0.35）；重叶 ×0.88；夹 0.8..1.9。 */
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(50).times(0.008).clamp(-0.15, 0.35))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(0.88), F.const(1)))
                .clamp(0.8, 1.9).round(2),
            "叶速", {
                unit: "格/刻",
                description: "叶片飞出去的速度；速度快的个体撒得更急，对手更来不及侧身。重叶式略慢。"
            }),
        /** 单叶判定：基础 0.22 格，碰撞箱每比 1.4 高 1 加 0.06（夹 −0.03..0.12）；重叶 ×1.35；夹 0.14..0.45。 */
        leafRadius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.03, 0.12))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(1.35), F.const(1)))
                .clamp(0.14, 0.45).round(2),
            "单叶判定", {
                unit: "格",
                description: "每片叶的横向判定厚度；个头越高的个体甩出的叶越大块，越不容易从缝里让开。"
            }),
        /** 扇面张角：基础 22 度，碰撞箱每比 0.9 宽 1 加 12（夹 −5..12）；重叶 ×0.7；夹 8..40。 */
        spread: formula(
            F.base(22).plus(F.body("width").minus(0.9).times(12).clamp(-5, 12))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(0.7), F.const(1)))
                .clamp(8, 40).round(1),
            "扇面张角", {
                unit: "度",
                description: "一把叶张开的扇面总角度；身体越宽的个体撒得越开，重叶式收窄成更集中的一束。"
            }),
        /** 起手：基础 4 刻，速度每比 50 快 1 减 0.012（夹 −0.6..1）；重叶 +1；夹在 3..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(50).times(0.012).clamp(-0.6, 1))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(1), F.const(0)))
                .clamp(3, 7).round(0),
            "起手", "抖身把叶子拢下来、撒出去的时间；速度越快越短，重叶式要多攒一下。"),
        /** 收招：基础 3 刻，速度每比 50 快 1 减 0.01（夹 −0.4..0.8）；夹在 2..5。 */
        aftercast: seconds(
            F.base(3).minus(F.stat("speed").minus(50).times(0.01).clamp(-0.4, 0.8)).clamp(2, 5).round(0),
            "收招", "撒完之后收势的时间；快的个体更利落。"),
        /** 冷却：基础 13 刻，速度每比 50 快 1 减 0.02（夹 −1.5..3）；重叶 +5；夹在 8..22。 */
        recharge: seconds(
            F.base(13).minus(F.stat("speed").minus(50).times(0.02).clamp(-1.5, 3))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.leafage.preference.heavy")), F.const(5), F.const(0)))
                .clamp(8, 22).round(0),
            "冷却", "再撒一把叶前的等待；PP 40 的手感，便宜、回得快。")
    });

    defineDamage(leafageId, "toss", { rationale: "嫩叶撒击的物理伤害；与原生一致走物理类别，不改变减伤规则。" }, {});

    stages(leafageId, [
        { level: 25, values: { toss: 32, count: 8 } },
        { level: 45, values: { toss: 38, reach: 9 } }
    ]);

    describe(leafageId, [
        { key: "description.0", values: ["toss","count"] },
        { key: "description.1", values: ["reach", "spread", "velocity"] },
        { key: "description.2", values: ["leafRadius"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.toss", "tier.0.count"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.toss", "tier.1.reach"] }
    ]);
}
