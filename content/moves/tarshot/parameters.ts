/**
 * 沥青射击 / tarshot — 参数与数值来源。
 *
 * 原生事实：Fire／变化／威力 —／命中 100／PP 15／单体；boosts={spe:-1}；附加挥发状态 tarshot，
 *   让目标对火属性的相性变差（原作里把首要属性的火相性 +1，实战等价于受到的火焰伤害翻倍）。
 * 原生介绍「泼洒黏糊糊的沥青，降低对手的速度，并且使对手的弱点变为火。」学习者 1，独有。
 *
 * 世界化：把「泼洒沥青」落成一团**会飞的黏稠沥青**——命中后糊在目标身上：速度等级 -1、移动也被黏住，
 *   并且**对火焰的弱点翻倍**（任何火属性招式打上去，伤害 ×2；由 `PokemonDamage.metadata` 在结算前读取
 *   目标的共享身份 `world_combat:status/tarshot` 后放大威力）。沥青也落在地上：命中点或落空点会留下一小滩
 *   租借的沥青（`world_combat:field/tar` 的规则），谁踩进去谁被糊上同样的沥青；水会把它冲掉（湿身即清除）。
 *
 * 与同族分开：它不封锁退路，而是**降低速度并打开一个属性弱点**——速度与「怕火」两件事同时成立；
 *   原生就是唯一的火属性泼洒招，学习者只有 1 个，读法也最直接：目标身上黑亮发黏、脚下留一滩黑。
 *
 * 数据分散（每项读不同精灵数据，落到不同参数）：
 *   globSpeed   沥青飞行速度：速度决定目标更难走开；大泼更沉。
 *   globRadius  判定半径：身高决定判定多宽。
 *   reach       泼洒距离：速度决定够得多远；定点比大泼远。
 *   coatTicks   沥青留在目标身上的时长：等级与防御决定糊多久。
 *   speedDrop   速度等级下降：体重 ≥200 的个体从 1 级升到 2 级。
 *   splash      大泼的覆盖半径：体型越宽泼得越大。
 *   slow        沥青的黏滞：体重决定导航速度再掉多少。
 *   puddle      地面沥青滩半径：体型越宽滩越大。
 *   puddleTicks 地面沥青存在多久：等级决定留多久。
 *   drops       飞溅的沥青点数量：物攻换算，驱动画面里的飞溅数量。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏。
 *
 * 配置 `wide`（大泼）双向取舍（默认关）：
 *   开（大泼）：命中点 `splash` 格内的非友方都被糊上，滩更大；代价是泼洒距离 −2 格、飞行 ×0.85、起手 +3 刻、冷却 +10 刻。
 *   关（定点）：只糊命中的那一个（命中点仍留下小滩），距离更远、飞得更快、起手与冷却更短。
 */
namespace PokemonSkills {
    export const tarshotWeakness = 2;

    actionParameters.define("tarshot", {
        /** 沥青速度：1.1 + (速度 −60) ×0.005；大泼 ×0.85；夹 0.8..1.7。 */
        globSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.005))
                .times(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(0.85), F.const(1.0)))
                .clamp(0.8, 1.7).round(2),
            "沥青速度", {
                unit: "格/刻",
                description: "沥青团飞行的速度；速度快的个体更早命中，大泼更沉更慢。"
            }),
        /** 判定半径：0.3 + (身高 −1.4) ×0.08 + 大泼 0.1；夹 0.22..0.65。 */
        globRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.08))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(0.1), F.const(0)))
                .clamp(0.22, 0.65).round(2),
            "判定半径", {
                unit: "格",
                description: "沥青团的横向判定半径；身量越高判定越宽，大泼再宽一点。"
            }),
        /** 泼洒距离：9 + (速度 −60) ×0.02 − 大泼 2；夹 6..13。 */
        reach: formula(
            F.base(9).plus(F.stat("speed").minus(60).times(0.02))
                .minus(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(2), F.const(0)))
                .clamp(6, 13).round(1),
            "泼洒距离", {
                unit: "格",
                description: "沥青能泼到多远；速度越快够得越远，大泼要靠近一点。它也是本招的实际射程。"
            }),
        /** 糊身时长：120 + 等级 ×1.5 + 防御 ×0.4；夹 100..300。 */
        coatTicks: seconds(
            F.base(120).plus(F.level().times(1.5)).plus(F.stat("defence").times(0.4)).clamp(100, 300).round(0),
            "糊身时长", "沥青黏在目标身上多久；等级与防御越高糊得越久。湿身或下雨会把它冲掉。"),
        /** 速度等级下降：1 + 体重 ≥200 加 1；夹 1..2。 */
        speedDrop: formula(
            F.base(1).plus(F.when(F.body("weight").gte(200), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "速度等级下降", {
                unit: "级",
                description: "被沥青糊住者掉多少级速度；体重 200 以上的个体泼得更稠，从 1 级升到 2 级。"
            }),
        /** 大泼半径：1.5 + 体型宽度 ×1.0；定点只用 0.6；夹 0.4..3.2。 */
        splash: formula(
            F.base(1.5).plus(F.body("width").times(1.0))
                .times(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(1.0), F.const(0.4)))
                .clamp(0.4, 3.2).round(2),
            "大泼半径", {
                unit: "格",
                description: "大泼形态下命中点周围多大范围内的非友方一起被糊上；体型越宽泼得越大，定点形态只覆盖命中点。"
            }),
        /** 弱点倍率：受到的火焰伤害 ×2，原作的「弱点变为火」。 */
        weakness: formula(
            F.const(tarshotWeakness), "弱点倍率", {
                unit: "倍",
                description: "被沥青糊住期间，任何火属性招式打在它身上的伤害倍率；原作的「弱点变为火」的对位。"
            }),
        /** 沥青滩半径：1.0 + 体型宽度 ×0.5；夹 0.6..2.4。 */
        puddle: formula(
            F.base(1.0).plus(F.body("width").times(0.5)).clamp(0.6, 2.4).round(2),
            "沥青滩半径", {
                unit: "格",
                description: "命中点或落空点会留下一滩沥青；体型越宽滩越大，踩进去的非友方也会被糊上。"
            }),
        /** 沥青滩时长：100 + 等级 ×1.5；夹 80..260。 */
        puddleTicks: seconds(
            F.base(100).plus(F.level().times(1.5)).clamp(80, 260).round(0),
            "沥青滩时长", "地上那滩沥青留多久；等级越高留得越久，到期原方块自己回来。"),
        /** 飞溅点数：14 + 物攻 ×0.2；夹 12..30。 */
        drops: formula(
            F.base(14).plus(F.stat("attack").times(0.2)).clamp(12, 30).round(0),
            "飞溅点数", {
                unit: "点",
                description: "沥青团糊上目标时飞溅的点数；物攻越高溅得越多，也决定画面里的飞溅数量。"
            }),
        /** 起手：9 − (速度 −60) ×0.03 + 大泼 3；夹 6..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把沥青聚成一团需要多久；速度越快越短，大泼要多蓄一点。"),
        /** 收招：7 + (身高 −1.4) ×0.8；夹 5..12。 */
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 12).round(0),
            "收招", "泼出之后的收势；身量越大收得越慢。"),
        /** 冷却：90 − (等级 −30) ×0.5 + 大泼 10；夹 60..120。 */
        recharge: seconds(
            F.base(90).minus(F.level().minus(30).max(0).times(0.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.tarshot.preference.wide")), F.const(10), F.const(0)))
                .clamp(60, 120).round(0),
            "冷却", "两次泼洒之间的等待；等级越高越熟练，大泼更费。PP 15 的代价。")
    });

    stages("tarshot", [
        { level: 40, values: { coatTicks: 190, puddleTicks: 160 } }
    ]);

    describe("tarshot", [
        { key: "description.0", values: ["speedDrop","coatTicks"] },
        { key: "description.1", values: ["weakness"] },
        { key: "description.2", values: ["globSpeed", "globRadius", "reach", "splash"] },
        { key: "description.3", values: ["puddle","puddleTicks"] },
        { key: "description.4", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.coatTicks", "tier.0.puddleTicks"] }
    ]);
}
