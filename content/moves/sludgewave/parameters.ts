/**
 * 污泥波 / sludgewave 的参数与伤害段。
 *
 * 原生事实：Poison／特殊／威力 95／命中 100／PP 10／target allAdjacent（自己周围所有宝可梦）／10% 中毒。
 * 翻译：把「用污泥波攻击自己周围所有的宝可梦」翻成**从脚下涌起一道黏稠的污泥潮，慢慢向外漫开再退**——
 * 它比同族走得慢、推得动，把路上的人往后挤；有些会中毒；退去后地上留下一滩滩污泥。
 * 与同族分开：重踏贴地瞬时推、放电瞬间炸、喷烟先立柱，只有污泥波是慢而黏的一潮，并且把地面弄脏。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   sludge       污泥潮威力 80 + 特攻偏移（毒液越浓伤得越狠）。
 *   waveRadius   漫开半径 3.4 格 + 特攻偏移 + 碰撞箱宽度偏移。
 *   surgeTicks   漫开时间 9 刻 − 速度偏移（涌浪式更慢更远）。
 *   push         把人推开的距离 0.25 格 + 特攻偏移（黏潮的推力）。
 *   toxinChance  中毒几率 0.10 + 特攻偏移 + 等级偏移。
 *   puddleTicks  泥洼停留 80 刻 + 等级。
 *   puddles      泥洼块数 18 + 特攻偏移（同时驱动画面密度）。
 *
 * 配置 `surge`（涌浪式）：开启＝半径 ×1.25、慢而久、推力更强，但单次威力 ×0.85，适合一次漫过一片地；
 * 关闭＝一发更厚更重的拍击（威力 ×1.12、半径最窄、更快）。两向各有适用局面。
 *
 * 伤害段 `sludge` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("sludgewave", {
        /** 污泥潮威力：80 + 特攻偏移[−16,44]；涌浪 ×0.85 / 拍击 ×1.12；夹 52..150。 */
        sludge: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 44))
                .times(F.when(F.pref("surge"), F.const(0.85), F.const(1.12)))
                .clamp(52, 150).round(1),
            "污泥潮威力", {
                unit: "威力",
                description: "污泥潮漫过时对圈内每个敌人各结算一次的基础威力；特攻越高毒液越浓。对手特防、相性与暴击在命中时另算。"
            }),
        /** 漫开半径：3.4 + 特攻偏移[−0.4,1.1] + 宽度偏移[−0.3,1.0]；涌浪 ×1.25 / 拍击 ×1.0；夹 2.2..6.0。 */
        waveRadius: formula(
            F.base(3.4)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.1))
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.3, 1.0))
                .times(F.when(F.pref("surge"), F.const(1.25), F.const(1)))
                .clamp(2.2, 6.0).round(2),
            "漫开半径", {
                unit: "格",
                description: "污泥潮从脚下漫到多远；特攻高、体型宽的个体漫得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 漫开时间：9 − 速度偏移[−1.5,2.5] + 涌浪 3；夹 5..14。 */
        surgeTicks: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("surge"), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "漫开时间", "污泥潮从脚下漫到最外圈要多久；越慢越黏，但目标也越有时间走开。"),
        /** 推开距离：0.25 + 特攻偏移[−0.06,0.3]；涌浪 ×1.2 / 拍击 ×1.0；夹 0.12..0.8。 */
        push: formula(
            F.base(0.25).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.06, 0.3))
                .times(F.when(F.pref("surge"), F.const(1.2), F.const(1)))
                .clamp(0.12, 0.8).round(2),
            "推开距离", {
                unit: "格",
                description: "污泥潮经过时把人沿离中心方向推开的距离；黏潮的推力随特攻增长，涌浪式推得更远。"
            }),
        /** 中毒几率：0.10 + 特攻偏移[−0.02,0.1] + 等级(≥20)偏移[0,0.06]；涌浪 ×0.9 / 拍击 ×1.0；夹 0.06..0.30。 */
        toxinChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.02, 0.1))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("surge"), F.const(0.9), F.const(1)))
                .clamp(0.06, 0.30).round(3),
            "中毒几率", "被污泥潮泡到的目标陷入中毒的几率；毒越浓、等级越高越容易中毒。"),
        /** 泥洼停留：80 + 等级 ×0.6；夹 60..160。 */
        puddleTicks: seconds(
            F.base(80).plus(F.level().times(0.6)).clamp(60, 160).round(0),
            "泥洼停留", "退去后留在地上的污泥洼停留多久；到期原方块回来。"),
        /** 泥洼块数：18 + 特攻 ×0.3；夹 14..40。同时驱动画面密度。 */
        puddles: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.3)).clamp(14, 40).round(0),
            "泥洼块数", {
                unit: "块",
                description: "退去后留在地上的污泥洼块数；随特攻增长，也决定画面的密度。"
            }),
        maxTargets: hidden(8)
    });

    defineDamage("sludgewave", "sludge", {});

    stages("sludgewave", [
        { level: 44, values: { sludge: 104, waveRadius: 3.9, toxinChance: 0.18 } }
    ]);

    describe("sludgewave", [
        { key: "description.0", values: ["sludge"] },
        { key: "description.1", values: ["waveRadius", "surgeTicks"] },
        { key: "description.2", values: ["toxinChance", "push"] },
        { key: "description.3", values: ["puddleTicks", "puddles"] },
        { key: "surge.on", values: [], when: function (context) { return read(context.detail.values, ["surge"]) === true; } },
        { key: "surge.off", values: [], when: function (context) { return read(context.detail.values, ["surge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sludge", "tier.0.waveRadius", "tier.0.toxinChance"] }
    ]);
}
