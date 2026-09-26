/**
 * 污泥波 / sludgewave 的参数与伤害段。
 *
 * 原生事实：Poison／特殊／威力 95／命中 100／PP 10／target allAdjacent（自己周围所有宝可梦）／10% 中毒。
 * 翻译：把「用污泥波攻击自己周围所有的宝可梦」翻成**把厚污泥自身体一次向周围泼开**——它不铺地、不前进，
 * 只在近处一次淋到；泥幕有实际高度，贴地低飞的敌人也会被溅到，高处的不会被追踪；被淋到的人挨伤、被推、可能中毒。
 * 与同族分开：重踏是贴地向外推的前沿、放电是逐目标瞬时电弧、喷烟是向上竖喷的烟柱，只有污泥波是近身一次三维泼洒。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   sludge        污泥威力 80 + 特攻偏移（毒液越浓伤得越狠）。
 *   waveRadius    泼开半径 3.4 格 + 特攻偏移 + 碰撞箱宽度偏移。
 *   curtainHeight 泥幕高度 1.4 格 + 碰撞箱高度偏移 + 特攻偏移（决定能溅到多低的飞行目标）。
 *   push          把人推开的距离 0.25 格 + 特攻偏移（黏潮的推力）。
 *   toxinChance   中毒几率 0.10 + 特攻偏移 + 等级偏移。
 *
 * 配置 `surge`（广泼式）：开启＝半径 ×1.25、泥幕更高、推得更远，但单次威力 ×0.85，适合被一群近敌围住时一次泼到；
 * 关闭＝一发更厚更重的厚泥拍击（威力 ×1.12、半径最窄）。两向各有适用局面。
 *
 * 伤害段 `sludge` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("sludgewave", {
        /** 污泥威力：80 + 特攻偏移[−16,44]；广泼 ×0.85 / 厚泥 ×1.12；夹 52..150。 */
        sludge: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 44))
                .times(F.when(F.pref("surge"), F.const(0.85), F.const(1.12)))
                .clamp(52, 150).round(1),
            "污泥威力", {
                unit: "威力",
                description: "污泥近身泼到时对圈内每个敌人各结算一次的基础威力；特攻越高毒液越浓。对手特防、相性与暴击在命中时另算。"
            }),
        /** 泼开半径：3.4 + 特攻偏移[−0.4,1.1] + 宽度偏移[−0.3,1.0]；广泼 ×1.25 / 厚泥 ×1.0；夹 2.2..6.0。 */
        waveRadius: formula(
            F.base(3.4)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.1))
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.3, 1.0))
                .times(F.when(F.pref("surge"), F.const(1.25), F.const(1)))
                .clamp(2.2, 6.0).round(2),
            "泼开半径", {
                unit: "格",
                description: "污泥从身体向周围泼到多远；特攻高、体型宽的个体泼得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 泥幕高度：1.4 + 高度偏移[−0.3,0.9] + 特攻偏移[−0.2,0.5]；广泼 ×1.15 / 厚泥 ×1.0；夹 0.9..2.6。 */
        curtainHeight: formula(
            F.base(1.4)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("surge"), F.const(1.15), F.const(1)))
                .clamp(0.9, 2.6).round(2),
            "泥幕高度", {
                unit: "格",
                description: "污泥能向上溅到身体中心以上多高；贴地低飞的敌人会落在这个高度带内，更高的不会被追踪。"
            }),
        /** 推开距离：0.25 + 特攻偏移[−0.06,0.3]；广泼 ×1.2 / 厚泥 ×1.0；夹 0.12..0.8。 */
        push: formula(
            F.base(0.25).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.06, 0.3))
                .times(F.when(F.pref("surge"), F.const(1.2), F.const(1)))
                .clamp(0.12, 0.8).round(2),
            "推开距离", {
                unit: "格",
                description: "污泥泼到时把人沿离中心方向推开的距离；黏潮的推力随特攻增长，广泼式推得更远。"
            }),
        /** 中毒几率：0.10 + 特攻偏移[−0.02,0.1] + 等级(≥20)偏移[0,0.06]；广泼 ×0.9 / 厚泥 ×1.0；夹 0.06..0.30。 */
        toxinChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.02, 0.1))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("surge"), F.const(0.9), F.const(1)))
                .clamp(0.06, 0.30).round(3),
            "中毒几率", "被污泥泼到的目标陷入中毒的几率；毒越浓、等级越高越容易中毒。"),
        maxTargets: hidden(8)
    });

    defineDamage("sludgewave", "sludge", {});

    stages("sludgewave", [
        { level: 44, values: { sludge: 104, waveRadius: 3.9, toxinChance: 0.18 } }
    ]);

    describe("sludgewave", [
        { key: "description.0", values: ["sludge","maxTargets"] },
        { key: "description.1", values: ["waveRadius","curtainHeight"] },
        { key: "description.2", values: ["toxinChance","push"] },
        { key: "description.3", values: [] },
        { key: "description.poison", values: [] },
        { key: "surge.on", values: [], when: function (context) { return read(context.detail.values, ["surge"]) === true; } },
        { key: "surge.off", values: [], when: function (context) { return read(context.detail.values, ["surge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sludge", "tier.0.waveRadius", "tier.0.toxinChance"] }
    ]);
}
