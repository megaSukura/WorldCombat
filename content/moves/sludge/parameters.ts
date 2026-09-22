/**
 * 污泥攻击 / sludge —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／特殊／威力 65／命中 100／PP 20／单体／30% 令目标中毒。
 *
 * 翻译：把「用污泥投掷对手」落成一记**低弧丢出去的湿泥团**——它比同族便宜、出手快、PP 多，
 *   甩出去时拖着泥点，落在谁身上就在谁身上摊开、顺着往下淌。它是这一族的基础投掷：没有炸弹的爆开、
 *   没有垃圾射击的负重，靠一次接一次地丢把毒累上去。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数上：
 *   glob         湿泥团威力：特攻决定泥里的毒性浓淡，等级带来熟练度。
 *   reach        投掷距离：特攻与等级决定能甩多远。
 *   globSpeed    出手速度：速度决定泥团脱手的初速。
 *   globRadius   泥团判定：碰撞箱高度决定泥团大小。
 *   poisonChance 中毒概率：特攻决定泥多脏；黏附形态再抬一档。
 *   venomTicks   中毒时长：等级与特攻（毒液分泌量）决定。
 *   drops        溅开泥点数：特攻决定，同时驱动画面密度。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 *
 * 配置 `cling`（黏附形态，默认关）双向取舍：开启＝泥团更黏更大（判定 ×1.2）、中毒概率 ×1.3、挂毒更久，
 *   但威力 ×0.9、飞得慢、起手多一拍；关闭＝丢得更快更重，但糊上去的机会小。两向各有适用局面。
 *
 * 伤害段 `glob` 与参数同名，走共享换算（原生类别 Special）。中毒走共享身份 world_combat:status/poison。
 */
namespace PokemonSkills {
    actionParameters.define("sludge", {
        /** 湿泥团威力：65 + 特攻偏移[−12,30]；黏附 ×0.9 / 快掷 ×1.1；夹 44..110。 */
        glob: formula(
            F.base(65).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-12, 30))
                .times(F.when(F.pref("cling"), F.const(0.9), F.const(1.1)))
                .clamp(44, 110).round(1),
            "湿泥团威力", {
                unit: "威力",
                description: "泥团在目标身上摊开时结算的基础威力；特攻越高毒液越浓。黏附形态把一部分力道留给毒性，这一下略轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 投掷距离：9 + 特攻偏移[−1.5,3] + 等级(≥25)偏移[0,0.6]；夹 7..13。 */
        reach: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .clamp(7, 13).round(2),
            "投掷距离", {
                unit: "格",
                description: "能把泥团甩到多远；特攻高、越来越熟练的个体够得更远。它也是本招的实际射程。"
            }),
        /** 出手速度：1.15 + 速度偏移[−0.15,0.4]；黏附 ×0.9 / 快掷 ×1.05；夹 0.85..1.6。 */
        globSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4))
                .times(F.when(F.pref("cling"), F.const(0.9), F.const(1.05)))
                .clamp(0.85, 1.6).round(2),
            "出手速度", {
                unit: "格/刻",
                description: "泥团脱手时的初速；速度快的个体甩得更急，黏附形态飞得慢一些。"
            }),
        globGravity: hidden(0.04),
        /** 泥团判定：0.22 + 高度偏移[−0.04,0.2]；黏附 ×1.2；夹 0.18..0.45。 */
        globRadius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.2))
                .times(F.when(F.pref("cling"), F.const(1.2), F.const(1)))
                .clamp(0.18, 0.45).round(2),
            "泥团判定", {
                unit: "格",
                description: "飞行与落点判定的泥团半径；体型越高泥团越大，黏附形态更厚。"
            }),
        /** 中毒概率：0.30 + 特攻偏移[−0.06,0.16]；黏附 ×1.3 / 快掷 ×1.0；夹 0.18..0.60。 */
        poisonChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.06, 0.16))
                .times(F.when(F.pref("cling"), F.const(1.3), F.const(1)))
                .clamp(0.18, 0.60).round(3),
            "中毒概率", "泥团糊上去后把毒带进体内的概率；原生 30% 起，特攻越高泥越脏，黏附形态再抬一档。"),
        /** 中毒时长：260 + 等级(≥25)偏移[0,120] + 特攻偏移[−20,70]；夹 200..480。 */
        venomTicks: seconds(
            F.base(260).plus(F.level().minus(25).times(4).clamp(0, 120))
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 70))
                .clamp(200, 480).round(0),
            "中毒时长", "毒如果没有立刻被解掉会持续多久；等级与特攻（毒液分泌量）越高挂得越久。"),
        /** 溅开泥点数：12 + 特攻偏移[−4,16]；黏附 ×1.4；夹 10..36。 */
        drops: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.12).clamp(-4, 16))
                .times(F.when(F.pref("cling"), F.const(1.4), F.const(1)))
                .clamp(10, 36).round(0),
            "溅开泥点数", {
                unit: "点",
                description: "泥团摊开时溅出的泥点数量，随特攻增长；粒子按它发射，画面密度与机制一致。"
            }),
        /** 起手：7 − 速度偏移[−1,2] + 黏附 1；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("cling"), F.const(1), F.const(0))).clamp(4, 12).round(0),
            "起手", "从脚边抓起一团泥再甩出去的时间；速度越快越短，黏附形态多捏一拍。"),
        /** 收招：6；黏附 ×1.15 / 快掷 ×0.95；夹 4..12。 */
        settle: seconds(
            F.base(6).times(F.when(F.pref("cling"), F.const(1.15), F.const(0.95))).clamp(4, 12).round(0),
            "收招", "甩完把手收回架势的时间；黏附形态要甩干净泥，收得更慢。"),
        /** 冷却：14 − 等级(≥25)偏移[0,3]；夹 8..20。 */
        recharge: seconds(
            F.base(14).minus(F.level().minus(25).times(0.1).clamp(0, 3)).clamp(8, 20).round(0),
            "冷却", "两次投掷之间的等待；等级越高回得越快，配合高 PP 可以一直丢。")
    });

    defineDamage("sludge", "glob", {});

    stages("sludge", [
        { level: 30, values: { glob: 72 } },
        { level: 45, values: { glob: 80, poisonChance: 0.40 } }
    ]);

    describe("sludge", [
        { key: "description.0", values: ["glob"] },
        { key: "description.1", values: ["reach", "globSpeed"] },
        { key: "description.2", values: ["poisonChance", "venomTicks"] },
        { key: "cling.on", values: [], when: function (context) { return read(context.detail.values, ["cling"]) === true; } },
        { key: "cling.off", values: [], when: function (context) { return read(context.detail.values, ["cling"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.glob"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.glob", "tier.1.poisonChance"] }
    ]);
}
