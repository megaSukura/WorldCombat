/**
 * 魔法火焰 / mysticalfire —— 参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 75／命中 100／PP 10／target normal／追加 100% 令目标特攻 −1。
 *
 * 翻译：把「从口中喷出特别灼热的火焰」落成一枚**会自己追上目标、绕着它盘成一圈炽焰的魔法火团**——
 * 火团脱手后沿着目标方向转向追踪，追上时夺走 1 级特攻；随后火焰缠住目标一段时间，每几刻再咬一口，
 * 缠满全程后火焰一收、再抽走 1 级特攻；命中还有概率点燃。它是四式里唯一会缠上目标、把特攻一点点
 * 抽走的那个：不是一记即走的远程，而是「贴上去不放」。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          火团威力：特攻定火多旺，等级给成长。
 *   coil          缠焰每跳威力：特攻定灼烧残留。
 *   wispSpeed     火团速度：速度决定追得多急。
 *   wispTurn      转向速率：特攻定火团追得多紧（越紧越难甩开）。
 *   wispRange     追踪射程：等级与身高决定追到多远。
 *   wispRadius    火团体型：身高决定火团大小。
 *   coilTicks     缠身时长：等级与特攻决定火焰盘多久；黏焰式更久。
 *   pulseTicks    缠焰间隔：速度决定两跳之间隔多久。
 *   leash         挣脱距离：特攻决定缠住后目标跑多远算挣脱。
 *   burnChance    点燃概率：特攻与黏焰式决定。
 *   siphonStages  首次抽取级数：固定 1 级特攻。
 *   finalStages   收束抽取级数：固定 1 级特攻（缠满全程才给）。
 *   wisps         火粒数：特攻与等级派生，也驱动表现。
 *   tempo         起手：速度决定聚焰出手的快慢。
 *
 * 配置 `linger`（黏焰式）双向取舍：开启＝火团更慢更短、威力单发略低，但缠得更久、每跳更疼、点燃概率大增、冷却 +6；
 * 关闭＝火团更快更远、一发打得更痛，但缠身与点燃都少。两向分别对应「缠住一个磨」与「远程一发」。
 *
 * 伤害段 `core`（火团命中）与 `coil`（缠焰每跳）各自成段，走共享换算（原生类别 Special）。
 * 特攻下降走共享能力等级阶梯 NativeEffects.boost(..., "spa", -1)；点燃经 `impact` 的 `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("mysticalfire", {
        /** 火团威力：66 + 特攻偏移[−12,34] + 等级(≥30)偏移[0,12]；夹 46..150。 */
        core: formula(
            F.base(66)
                .plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-12, 34))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .clamp(46, 150).round(1),
            "火团威力", {
                unit: "威力",
                description: "魔法火团追上目标时结算一次的威力；特攻越高烧得越狠、等级越高越经烧。对手特防、相性与暴击在命中时另算。"
            }),
        /** 缠焰威力：9 + 特攻偏移[−3,10]；黏焰 ×1.2；夹 5..26。 */
        coil: formula(
            F.base(9).plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-3, 10))
                .times(F.when(F.pref("linger"), F.const(1.2), F.const(1)))
                .clamp(5, 26).round(1),
            "缠焰威力", {
                unit: "威力",
                description: "火焰缠住目标后每跳一次的伤害；特攻越高残留灼烧越咬人，黏焰式更疼。"
            }),
        /** 火团速度：0.62 + 速度偏移[−0.1,0.35]；黏焰 ×0.8；夹 0.42..1.15。 */
        wispSpeed: formula(
            F.base(0.62).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.1, 0.35))
                .times(F.when(F.pref("linger"), F.const(0.8), F.const(1)))
                .clamp(0.42, 1.15).round(2),
            "火团速度", {
                unit: "格/刻",
                description: "火团脱手后的追击速度；速度快的个体追得更急，黏焰式慢一点更容易缠上。"
            }),
        /** 转向速率：34 + 特攻偏移[−8,20]；夹 20..70。 */
        wispTurn: formula(
            F.base(34).plus(F.stat("specialAttack").minus(55).times(0.25).clamp(-8, 20)).clamp(20, 70).round(0),
            "转向速率", {
                unit: "度/刻",
                description: "火团每刻朝目标修正的角度；特攻越高追得越紧，目标越难靠走位甩开。"
            }),
        /** 追踪射程：9 + 等级(≥25)偏移[0,4] + 高度偏移[−0.3,1.0]；黏焰 ×0.85；夹 6..15。 */
        wispRange: formula(
            F.base(9)
                .plus(F.level().minus(25).times(0.07).clamp(0, 4))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .times(F.when(F.pref("linger"), F.const(0.85), F.const(1)))
                .clamp(6, 15).round(2),
            "追踪射程", {
                unit: "格",
                description: "火团最远能追到多远；等级高、体型大的个体追得远，黏焰式收短一些。它也是本招的实际射程。"
            }),
        /** 火团体型：0.4 + 高度偏移[−0.05,0.25]；夹 0.32..0.72。 */
        wispRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.25)).clamp(0.32, 0.72).round(2),
            "火团体型", {
                unit: "格",
                description: "火团飞行与命中的判定半径；身板越大火团越粗。"
            }),
        /** 缠身时长：50 + 等级(≥30)偏移[0,28] + 特攻偏移[−5,14]；黏焰 ×1.4；夹 30..130。 */
        coilTicks: seconds(
            F.base(50)
                .plus(F.level().minus(30).times(0.9).clamp(0, 28))
                .plus(F.stat("specialAttack").minus(55).times(0.2).clamp(-5, 14))
                .times(F.when(F.pref("linger"), F.const(1.4), F.const(1)))
                .clamp(30, 130).round(0),
            "缠身时长", "火焰缠住目标多久；等级与特攻越高盘得越久，黏焰式显著更久。"),
        /** 缠焰间隔：14 − 速度偏移[−3,5]；夹 8..20。 */
        pulseTicks: seconds(
            F.base(14).minus(F.stat("speed").minus(50).times(0.05).clamp(-3, 5)).clamp(8, 20).round(0),
            "缠焰间隔", "缠焰两跳之间隔多久；速度快的个体咬得更密。"),
        /** 挣脱距离：7 + 特攻偏移[−2,3]；夹 5..10。 */
        leash: formula(
            F.base(7).plus(F.stat("specialAttack").minus(55).times(0.02).clamp(-2, 3)).clamp(5, 10).round(1),
            "挣脱距离", {
                unit: "格",
                description: "火焰缠住后，目标跑出这么远就算挣脱、火焰散去；特攻越高缠得越紧。"
            }),
        /** 点燃概率：0.15 + 特攻偏移[−0.04,0.09] + 黏焰 0.35；夹 0.08..0.6。 */
        burnChance: percent(
            F.base(0.15).plus(F.stat("specialAttack").minus(55).times(0.0012).clamp(-0.04, 0.09))
                .plus(F.when(F.pref("linger"), F.const(0.35), F.const(0)))
                .clamp(0.08, 0.6).round(3),
            "点燃概率", "命中时点燃目标的概率；特攻越高、黏焰式越容易点着。"),
        /** 首次抽取级数：固定 1 级特攻。 */
        siphonStages: formula(
            F.base(1),
            "首次抽取级数", {
                unit: "级",
                description: "火团命中时夺走的能力等级；原生「降低特攻」即 1 级。"
            }),
        /** 收束抽取级数：固定 1 级特攻，缠满全程才给。 */
        finalStages: formula(
            F.base(1),
            "收束抽取级数", {
                unit: "级",
                description: "火焰缠满整个时长后，收束时再夺走的特攻等级。"
            }),
        /** 火粒数：12 + 特攻偏移[−2,6] + 等级(≥30)偏移[0,7]；夹 10..40。 */
        wisps: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(55).times(0.12))
                .plus(F.level().minus(30).times(0.25))
                .clamp(10, 40).round(),
            "火粒数", {
                unit: "粒",
                description: "火团与缠焰的粒子数量，也驱动表现密度；特攻与等级越高越密。"
            }),
        /** 起手：10 − 速度偏移[−? ,?] + 黏焰 2；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04))
                .plus(F.when(F.pref("linger"), F.const(2), F.const(0)))
                .clamp(6, 14).round(),
            "起手", "把魔法火焰在喉间收成一枚火团再吐出的时间；速度越快越短，黏焰式多花一点。")
    });

    defineDamage("mysticalfire", "core", {});
    defineDamage("mysticalfire", "coil", {});

    stages("mysticalfire", [
        { level: 35, values: { core: 72, coilTicks: 58 } }
    ]);

    describe("mysticalfire", [
        { key: "description.0", values: ["core", "siphonStages"] },
        { key: "description.1", values: ["wispRange", "wispSpeed", "wispTurn"] },
        { key: "description.2", values: ["coilTicks", "coil", "pulseTicks", "finalStages"] },
        { key: "description.3", values: ["burnChance"] },
        { key: "linger.on", values: ["coilTicks", "coil", "burnChance"],
            when: function (context) { return read(context.detail.values, ["linger"]) === true; } },
        { key: "linger.off", values: ["coilTicks", "burnChance"],
            when: function (context) { return read(context.detail.values, ["linger"]) !== true; } },
        { key: "timing", values: ["wispRange", "tempo", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.coilTicks"] }
    ]);
}
