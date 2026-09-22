/**
 * 大地之力 / earthpower —— 参数与伤害段。
 *
 * 原生事实：Ground／特殊／威力 90／命中 100／PP 10／flags 带 nonsky／目标单体／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「向对手脚下释放出大地之力」落成一记**从目标脚下自下而上爆发**的地脉。它没有飞行物、不看成
 * 施法者的朝向：先在目标脚下亮出一圈将被掀开的记号（`mark`，起手就是对手走位的窗口），随后那一点的地面
 * 向上崩开、把站在地上的目标顶起，并在地面留下一小片裂开的土石。离地的东西（飞行、漂浮、被抛在空中）
 * 从地脉上方过去，什么也吃不到——这是 `nonsky` 的翻译。它是磨防远击四式里唯一从目标脚下出手、唯一只打
 * 站在地上的目标、唯一把地面（而不是自己）掀开的那个。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          地脉威力：特攻定地力，等级定深度。
 *   burstRadius   爆发半径：碰撞箱宽度与特攻共同决定掀开多大一点。
 *   reach         射程：特攻定能送地脉到多远。
 *   launch        上顶初速：特攻决定把目标顶起多高。
 *   tempo         起手：速度决定记号亮起到地面崩开多快，也就是对手的走位窗口。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   ruptureTicks  裂痕停留：等级与特攻决定那片裂地留多久。
 *   ruptureCells  裂痕块数：特攻决定掀开多少块，也驱动表现。
 *   shards        碎土数：特攻与等级决定迸出的碎土数量，也驱动表现。
 *
 * 配置 `fissure`（裂隙式）：开启＝爆发半径 ×1.4、裂痕块数 ×1.6、碎土 ×1.3，但威力 ×0.88、冷却 +4 刻，
 * 适合一次罩住一小片；关闭＝更窄更痛的一柱地脉，适合点名单体。两向各有适用局面。
 *
 * 伤害段 `core`：地脉顶起那一下，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("earthpower", {
        core: formula(
            F.base(88)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 34))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("fissure"), F.const(0.88), F.const(1)))
                .clamp(50, 138).round(1),
            "地脉威力", {
                unit: "威力",
                description: "地脉顶起那一下的基础威力；特攻越高地力越足，等级越高地脉越深。裂隙式把能量摊给更宽的一片，这一柱略轻。对手特防、相性与暴击在命中时另算。"
            }),
        burstRadius: formula(
            F.base(1.7)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.2, 0.7))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.2, 0.5))
                .times(F.when(F.pref("fissure"), F.const(1.4), F.const(1)))
                .clamp(1.3, 3.2).round(2),
            "爆发半径", {
                unit: "格",
                description: "目标脚下被掀开的那一点有多大；体型宽、特攻高的个体掀得更开。它也是本招的落点范围。"
            }),
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4)).clamp(9, 17).round(1),
            "射程", {
                unit: "格",
                description: "能把地脉送到多远的目标脚下；特攻高送得远。它也是本招的实际射程来源。"
            }),
        launch: formula(
            F.base(0.4).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.1, 0.35)).clamp(0.2, 0.9).round(3),
            "上顶初速", {
                unit: "格/刻",
                description: "被地脉顶起的目标获得的向上初速；特攻越高顶得越高，离地的这段时间也更长。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 4)).clamp(8, 18).round(0),
            "起手", "从目标脚下亮起记号到地面崩开的时间；速度快的个体发动得更急。这段时间也是对手走出落点的窗口。"),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.0012).clamp(0, 0.06))
                .clamp(0.06, 0.30).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 10% 起，特攻与等级越高越容易咬住。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        ruptureTicks: seconds(
            F.base(120)
                .plus(F.level().minus(28).times(1.1).clamp(0, 60))
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 12))
                .clamp(90, 220).round(0),
            "裂痕停留", "目标脚下那片裂地停留多久；等级与特攻越高裂得越久。到期原方块回来。"),
        ruptureCells: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-2, 6))
                .times(F.when(F.pref("fissure"), F.const(1.6), F.const(1)))
                .clamp(8, 28).round(0),
            "裂痕块数", {
                unit: "块",
                description: "目标脚下被掀开的块数；特攻越高掀得越多，裂隙式更宽。它也驱动表现的密度。"
            }),
        shards: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.14))
                .plus(F.level().minus(28).times(0.3))
                .times(F.when(F.pref("fissure"), F.const(1.3), F.const(1)))
                .clamp(12, 44).round(),
            "碎土数", {
                unit: "块",
                description: "地脉崩开时迸出的碎土数量，也驱动表现的密度；特攻与等级越高越密。"
            })
    });

    defineDamage("earthpower", "core", {});

    stages("earthpower", [
        { level: 44, values: { core: 106, reach: 14 } }
    ]);

    describe("earthpower", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["burstRadius", "launch"] },
        { key: "description.2", values: ["sunderChance", "sunderStage"] },
        { key: "description.3", values: ["tempo", "reach", "ruptureTicks", "ruptureCells", "shards", "pref.fissure"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.reach"] }
    ]);
}
