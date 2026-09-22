/**
 * 电网 / electroweb 的参数与伤害段。
 *
 * 原生事实：Electric／特殊／威力 55／命中 95／PP 15／target allAdjacentFoes／100% 降速度一级。
 *
 * 翻译：把「用电网捉住对手」翻成一张**抛出去、摊开后留在场上的电网**——它落在选定的点上，网面张开，
 * 谁踏进来谁被电一下、速度下降，并被短时间缠住脚；留在网里还会被反复电。它是本组唯一「可以提前布下、
 * 等人踩」的招。
 * 与同族分开：
 *   电网     —— 网抛到一点后留在那里，踏进去才触电，是可布控的场地。
 *   冰冻之风 —— 冷气锋自己向前走，扫过一条走廊，不在原地留驻。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   strike       触电初击威力 36 + 特攻偏移 + 等级偏移（电流越足第一下越疼）。
 *   tickle       网内每跳威力 7 + 特攻偏移（残留电量）。
 *   netRadius    网面半径 2.2 + 宽度偏移 + 特攻偏移（体型宽、电流足铺得越开）。
 *   netTicks     电网存续 130 刻 + 等级偏移 + HP 偏移。
 *   pulseTicks   两跳间隔 16 刻 − 速度偏移（速度快的人电得密）。
 *   pinTicks     入网缠足 12 刻 + 等级偏移（等级越高缠得越牢）。
 *   slowStages   减速等级 1 级；过载式 +1。
 *   reach        抛网距离 9 + 速度偏移 + 特攻偏移（抛得急、电流足扔得远）。
 *   throwSpeed   抛网速度 1.0 + 速度偏移。
 *   holdTicks    网内持续缠身刷新 26 刻 − 速度偏移。
 *   tempo        起手 10 刻 − 速度偏移。
 *
 * 配置 `overcharge`（过载式）：开启＝网面收窄到 0.72 倍、存续 ×0.75、初击 ×1.3、多降一级速度、起手 +2、
 * 冷却 +8，用来一发电痛并锁死；关闭＝网铺得更广更久、初击更低，用来封一片地。两向各有适用局面。
 *
 * 伤害段 `strike`（初击）与 `tickle`（网内每跳）各自成段，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("electroweb", {
        /** 初击威力：36 + 特攻偏移[−10,22] + 等级(≥25)偏移[0,10]；过载 ×1.3；夹 22..84。 */
        strike: formula(
            F.base(36)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 22))
                .plus(F.level().minus(25).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("overcharge"), F.const(1.3), F.const(1)))
                .clamp(22, 84).round(1),
            "触电初击威力", {
                base: 36, unit: "威力",
                description: "目标踏进电网时被电的那一下基础威力；特攻与等级越高越疼，过载式再抬高三成。对手特防、相性与暴击在命中时另算。"
            }),
        /** 网内每跳威力：7 + 特攻偏移[−2,10]；夹 4..20。 */
        tickle: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 10)).clamp(4, 20).round(1),
            "网内每跳威力", {
                base: 7, unit: "威力",
                description: "还留在网里的人每隔一次网内间隔挨一下的残余电流伤害；特攻越高残留电量越强。"
            }),
        /** 网面半径：2.2 + 宽度偏移[−0.3,1.3] + 特攻偏移[−0.4,0.9]；过载 ×0.72；夹 1.4..4.0。 */
        netRadius: formula(
            F.base(2.2)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.3, 1.3))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.4, 0.9))
                .times(F.when(F.pref("overcharge"), F.const(0.72), F.const(1)))
                .clamp(1.4, 4.0).round(2),
            "网面半径", {
                base: 2.2, unit: "格",
                description: "电网摊开覆盖的半径；体型越宽、电流越足铺得越大，也是指示圈与实际判定半径。"
            }),
        /** 存续时长：130 + 等级(≥25)偏移[0,30] + HP 偏移[−6,14]；过载 ×0.75；夹 70..200。 */
        netTicks: seconds(
            F.base(130)
                .plus(F.level().minus(25).times(0.9).clamp(0, 30))
                .plus(F.stat("hp").minus(60).times(0.1).clamp(-6, 14))
                .times(F.when(F.pref("overcharge"), F.const(0.75), F.const(1)))
                .clamp(70, 200).round(0),
            "存续时长", "电网摊在地上通电多久；等级与 HP 越高、非过载式留得越久。"),
        /** 两跳间隔：16 − 速度偏移[−2,4]；夹 8..22。 */
        pulseTicks: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(8, 22).round(0),
            "两跳间隔", "网内余电两跳之间隔多久；速度快的个体电得更密。"),
        /** 入网缠足：12 + 等级(≥20)偏移[0,12]；夹 8..26。 */
        pinTicks: seconds(
            F.base(12).plus(F.level().minus(20).times(0.25).clamp(0, 12)).clamp(8, 26).round(0),
            "入网缠足", "踏进电网那一下被缠住脚、定在原地多久；等级越高缠得越牢。"),
        /** 减速等级：1 级，过载 +1；夹 1..2。 */
        slowStages: formula(
            F.base(1).plus(F.when(F.pref("overcharge"), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "减速等级", {
                base: 1, unit: "级",
                description: "被电到的目标速度下降几级；对宝可梦落到原生速度等级，对其他战斗者落到移动速度属性。"
            }),
        /** 抛网距离：9 + 速度偏移[−1,2] + 特攻偏移[−1,2]；夹 7..13。 */
        reach: formula(
            F.base(9)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2))
                .clamp(7, 13).round(2),
            "抛网距离", {
                base: 9, unit: "格",
                description: "能把电网抛到多远；速度与特攻越高扔得越远，也是本招的实际射程。"
            }),
        /** 抛网速度：1.0 + 速度偏移[−0.15,0.4]；夹 0.8..1.5。 */
        throwSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.8, 1.5).round(2),
            "抛网速度", {
                base: 1.0, unit: "格/刻",
                description: "电网脱手飞向落点的速度；速度快的个体抛得更急，目标更难走位躲开。"
            }),
        /** 缠身刷新：26 − 速度偏移[−2,4]；夹 16..36。 */
        holdTicks: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(16, 36).round(0),
            "缠身刷新", "还站在网里时被缠身状态每次刷新的时长；离开电网后还会拖一小段。"),
        /** 起手：10 − 速度偏移[−1.5,2.0] + 过载 2；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.0))
                .plus(F.when(F.pref("overcharge"), F.const(2), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把电网织好再抛出的时间；速度越快起手越短。"),
        maxTargets: hidden(8)
    });

    defineDamage("electroweb", "strike", {});
    defineDamage("electroweb", "tickle", {});

    stages("electroweb", [
        { level: 44, values: { strike: 50, netRadius: 2.6 } }
    ]);

    describe("electroweb", [
        { key: "description.0", values: ["strike"] },
        { key: "description.1", values: ["netRadius", "netTicks"] },
        { key: "description.2", values: ["slowStages", "pinTicks"] },
        { key: "description.3", values: ["tickle", "pulseTicks", "holdTicks"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike", "tier.0.netRadius"] }
    ]);
}
