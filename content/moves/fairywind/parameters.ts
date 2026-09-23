/**
 * 妖精之风 / fairywind —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fairy／特殊／威力 40／命中 100／PP 30／优先度 0／单体，
 *   非接触（protect/mirror/metronome），无次要效果。描述「刮起妖精之风，吹向对手进行攻击。」学习者 28。
 *
 * 翻译：把「刮起妖精之风」落成**一阵打着旋、裹着香粉的暖风**——它从身侧卷起，沿瞄准方向旋转着扑出去，
 *   **穿过一个又一个对手而不停在第一个身上**；每个被扫到的对手挨一记特殊伤害，再被旋向甩到一侧。
 *   风散时在尽头留下一圈粉色香尘。原生 100% 命中的「风追着吹」落成风会继续前进、不因首个命中停下。
 *
 * 与同族分开：起风是一发即散、沿风推人的小风团；银色旋风是一大片铺开的扇面；预知未来前的预兆之风会追人再炸；
 *   冰息是一堵贴地推进的冷锋。只有妖精之风**穿过一串对手、逐个把它们甩向侧面**。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   gale       单次命中威力：特攻定风的烈度；广旋式 ×0.85。
 *   pierce     贯穿上限：特攻与等级决定一条线上最多穿过几个；广旋式 +1。
 *   flight     风的速度：速度。
 *   radius     风团判定：碰撞箱高度；广旋式 ×1.5。
 *   fling      侧甩距离：特攻与体重共同决定；广旋式 ×1.4。
 *   reach      射程：等级与特攻决定。它也是本招实际射程。
 *   motes      风团量：特攻换算，驱动飞行与散开的香尘数量。
 *   tempo／aftercast／recharge：速度定节奏；广旋式更慢、冷却更长。
 *
 * 配置 `wide`（广旋式）双向取舍（默认关，轻掠式）：
 *   开（广旋式）：判定 ×1.5、贯穿 +1、侧甩 ×1.4，但单次 ×0.85、起手 +1 刻、冷却 +5 刻——扫得更宽更散。
 *   关（轻掠式）：单次 ×1.15、出手快、冷却短，但判定窄、贯穿少、侧甩弱——一条更细更利的线。
 *
 * 伤害段 `gale` 与参数同名，走共享换算（原生类别 Special，Fairy 属性，非接触）。
 */
namespace PokemonSkills {
    export const fairywindId = "fairywind";
    export const fairywindScene = "world_combat:move_fairywind";
    export const fairywindHitText = "world_combat.move.fairywind.text.hit";
    export const fairywindMissText = "world_combat.move.fairywind.text.miss";
    /** 表现里风团判定的参考值（格）；服务端传 scale = 实际判定 / 这个值。 */
    export const fairywindReference = 0.3;

    actionParameters.define(fairywindId, {
        /** 单次命中威力：基础 30，特攻每比 50 多 1 加 0.09（夹 −4..15），速度每比 50 快 1 加 0.04（夹 −1..4）；
         *  广旋 ×0.85；夹在 16..48。 */
        gale: formula(
            F.base(30)
                .plus(F.stat("specialAttack").minus(50).times(0.09).clamp(-4, 15))
                .plus(F.stat("speed").minus(50).times(0.04).clamp(-1, 4))
                .times(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(0.85), F.const(1)))
                .clamp(16, 48).round(1),
            "单次威力", {
                unit: "威力",
                description: "风扫过每个对手时那一下的威力；特攻越高风越烈，速度给出风的冲劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贯穿上限：基础 1，特攻每比 60 多 1 加 0.02（夹 0..1.2），等级 35 起每级 +0.02（夹 0..1）；广旋 +1；向下取整，夹在 0..3。 */
        pierce: formula(
            F.base(1)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 1.2))
                .plus(F.level().minus(35).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(1), F.const(0)))
                .floor().clamp(0, 3),
            "贯穿上限", {
                unit: "个",
                description: "风最多再穿过几个对手；特攻与等级越高穿得越多，广旋式再多穿一个。"
            }),
        /** 风速：基础 1.5，速度每比 50 快 1 加 0.006（夹 −0.15..0.3）；夹 1.1..2.0。 */
        flight: formula(
            F.base(1.5).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.15, 0.3)).clamp(1.1, 2.0).round(2),
            "风速", {
                unit: "格/刻",
                description: "风扑出去的速度；速度快的个体刮得更急，对手更来不及侧身让开。"
            }),
        /** 风团判定：基础 0.3 格，碰撞箱每比 1.4 高 1 加 0.1（夹 −0.05..0.2）；广旋 ×1.5；夹 0.2..0.75。 */
        radius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.2))
                .times(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(1.5), F.const(1)))
                .clamp(0.2, 0.75).round(2),
            "风团判定", {
                unit: "格",
                description: "这团旋风的横向判定厚度；个头越高的个体刮出的风团越大，广旋式更宽。画出的风团与它一致。"
            }),
        /** 侧甩距离：基础 0.6 格，特攻每比 50 多 1 加 0.006（夹 −0.15..0.5），体重每 40 加 0.2（夹 0..0.5）；广旋 ×1.4；夹 0.3..1.8。 */
        fling: formula(
            F.base(0.6)
                .plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.15, 0.5))
                .plus(F.body("weight").div(40).clamp(0, 0.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(1.4), F.const(1)))
                .clamp(0.3, 1.8).round(2),
            "侧甩距离", {
                unit: "格",
                description: "被风扫到的对手沿旋向被甩开多远；特攻越高、身体越重甩得越开，广旋式更用力。"
            }),
        /** 射程：基础 9 格，等级 25 起每级 +0.06（夹 −1..2.5），特攻每比 50 多 1 加 0.02（夹 −0.8..1.5）；广旋 ×0.95；夹 7..14。 */
        reach: formula(
            F.base(9)
                .plus(F.level().minus(25).times(0.06).clamp(-1, 2.5))
                .plus(F.stat("specialAttack").minus(50).times(0.02).clamp(-0.8, 1.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(0.95), F.const(1)))
                .clamp(7, 14).round(1),
            "射程", {
                unit: "格",
                description: "风能刮到多远的目标；等级与特攻越高刮得越远。它也是本招的实际射程。"
            }),
        /** 风团量：基础 16，特攻每比 50 多 1 加 0.14（夹 −4..14）；夹 12..34。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).times(0.14).clamp(-4, 14)).clamp(12, 34).round(0),
            "风团量", {
                unit: "团",
                description: "风里卷着的香粉团数量，由特攻换算；它驱动飞行与散开的表现密度，不是独立伤害。"
            }),
        /** 起手：基础 6 刻，速度每比 50 快 1 减 0.02（夹 −0.8..1.5）；广旋 +1；夹在 4..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(1), F.const(0)))
                .clamp(4, 9).round(0),
            "起手", "把香风拢起来、打上旋的时间；速度越快越短，广旋式要多攒一下。"),
        /** 收招：基础 5 刻，速度每比 50 快 1 减 0.015（夹 −0.5..1）；夹在 3..8。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1)).clamp(3, 8).round(0),
            "收招", "风撒出去之后收势的时间；快的个体更利落。"),
        /** 冷却：基础 16 刻，速度每比 50 快 1 减 0.025（夹 −1.5..3）；广旋 +5；夹在 11..26。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(50).times(0.025).clamp(-1.5, 3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.fairywind.preference.wide")), F.const(5), F.const(0)))
                .clamp(11, 26).round(0),
            "冷却", "再刮一阵风前的等待；PP 30 的手感，广旋式更费。")
    });

    defineDamage(fairywindId, "gale", { rationale: "妖精之风的特殊伤害；与原生一致走特殊类别，不改变减伤规则。" }, { flags: { wind: true } });

    stages(fairywindId, [
        { level: 30, values: { gale: 38, pierce: 2 } },
        { level: 50, values: { gale: 46, reach: 11 } }
    ]);

    describe(fairywindId, [
        { key: "description.0", values: ["gale","pierce"] },
        { key: "description.1", values: ["reach","flight","radius"] },
        { key: "description.2", values: ["fling"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gale", "tier.0.pierce"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gale", "tier.1.reach"] }
    ]);
}
