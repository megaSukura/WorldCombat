/**
 * 震级 / magnitude 的参数与伤害段。
 *
 * 原生事实：Ground／物理／威力 0（`onModifyMove` 按 100 面骰当场掷一个震级 4..10，对应威力
 *   10／30／50／70／90／110／150，概率 5／10／20／30／20／10／5，且 `isNonstandard: "Past"`）／
 *   命中 100／PP 30／target allAdjacent（自己周围所有宝可梦）／flags 带 nonsky（不命中离地的东西）。
 *
 * 翻译：把「晃动地面」翻成**地面在原地颤、震级当场掷**——它不是把整块地掀起来（那是地震），
 *   而是脚下一道接一道的横颤，离地的人不受影响；这一次抖得多大由掷出的震级决定，震级越大尘跳得越高、
 *   圈里被颠得越狠，震级够大时正在出手的人会被抖得**打断动作**。提交时先把震级亮出并让地面预震约 6 刻，
 *   预震期间离开地面即可躲开随后的落震（原地、不改方块）。与同族分开：
 *     震级   —— 原地横颤、威力当场随机、够大就打断动作、不留痕；
 *     地震   —— 整块地面一次掀起、把人向上抛、留放射状深缝；
 *     重踏   —— 地裂贴地向外推、削速度、留裂痕；
 *     冲浪   —— 整圈水同时漫开，空中地上一起淹；
 *     自爆   —— 紧凑的一颗火球，用命换；
 *     大爆炸 —— 更大更慢、炸完留焦坑。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   quake      震级威力基准（震级 7 时）70 + 物攻偏移 + **体重偏移** + 等级偏移（越沉砸得越实、等级越高越重）。
 *   shudder    震幅半径 3.8 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高震得更开）。
 *   jolt       上颠初速 0.16 格/刻 + 物攻偏移（力量越大把人颠得越高，但远小于地震的上抛）。
 *   stagger    踉跄位移 0.3 格 + 物攻偏移（被横颤推得站不稳）。
 *   fracture   打断阈值 8 级 − 等级偏移（越熟练越低的震级就能抖断动作）。
 *   crests     震波道数 3 + 物攻 ×0.02（同时驱动画面里颤动的道数）。
 *   dust       扬尘量 18 + 物攻 ×0.3 + 体重 ×0.15（同时驱动画面密度）。
 *   tempo／aftercast／recharge  速度与等级决定起手、收势与冷却。
 *
 * 配置 `fault`（深源式）：开启＝掷出的震级整体 +1（下限抬高、期望更高）、震幅 ×1.15、打断阈值 −1，
 *   但起手 +4 刻、冷却 +14；关闭（浅源式）＝震级全范围 4..10 都可能（可能很小）、震幅 ×0.9、起手与冷却更短。
 *   两向各有适用局面：深源吃稳定高伤与可靠打断，浅源出手快、用来反复骚扰。
 *
 * 伤害段 `quake` 与参数同名，走共享换算（原始类别 Physical、Ground 属性）。实际威力 = quake × 震级系数。
 */
namespace PokemonSkills {
    actionParameters.define("magnitude", {
        /** 震级威力基准（震级 7）：70 + 物攻偏移[−16,44] + 体重偏移[−8,24] + 等级(≥25)偏移[0,16]；夹 40..140。 */
        quake: formula(
            F.base(70)
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-16, 44))
                .plus(F.body("weight").minus(60).times(0.05).clamp(-8, 24))
                .plus(F.level().minus(25).times(0.4).clamp(0, 16))
                .clamp(40, 140).round(1),
            "震级威力", {
                unit: "威力",
                description: "震级为 7 时的基准威力；实际一次震动的威力按掷出的震级乘上系数（震级 4/5/6/7/8/9/10 对应 ×0.14/0.43/0.71/1/1.29/1.57/2.14）。物攻越高、身体越沉、等级越高基准越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 震幅半径：3.8 + 宽度偏移[−0.3,1.4] + 等级(≥25)偏移[0,1.2]；深源 ×1.15 / 浅源 ×0.9；夹 2.6..6.2。 */
        shudder: formula(
            F.base(3.8)
                .plus(F.body("width").minus(0.9).times(0.9).clamp(-0.3, 1.4))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("fault", text("worldcombat.skill.magnitude.preference.fault")), F.const(1.15), F.const(0.9)))
                .clamp(2.6, 6.2).round(2),
            "震幅半径", {
                unit: "格",
                description: "地面在身周多大一圈里颤；体型宽、等级高的个体震得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 上颠初速：0.16 + 物攻偏移[−0.05,0.18]；夹 0.08..0.4。 */
        jolt: formula(
            F.base(0.16).plus(F.stat("attack").minus(60).times(0.0022).clamp(-0.05, 0.18)).clamp(0.08, 0.4).round(3),
            "上颠初速", {
                unit: "格/刻",
                description: "被横颤颠起来的一点向上初速；力量大的个体颠得高一点，但远不足以像地震那样把人抛飞。"
            }),
        /** 踉跄位移：0.3 + 物攻偏移[−0.08,0.35]；夹 0.15..0.75。 */
        stagger: formula(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.08, 0.35)).clamp(0.15, 0.75).round(2),
            "踉跄位移", {
                unit: "格",
                description: "被横颤推得站不稳、沿离中心方向挪开的距离；力量越大推得越远。"
            }),
        /** 打断阈值：8 − 等级(≥25)偏移[0,2] − 深源 1；夹 6..8。 */
        fracture: formula(
            F.base(8).minus(F.level().minus(25).times(0.08).clamp(0, 2))
                .minus(F.when(F.pref("fault", text("worldcombat.skill.magnitude.preference.fault")), F.const(1), F.const(0)))
                .clamp(6, 8).round(0),
            "打断阈值", {
                unit: "级",
                description: "掷出的震级达到这个数，圈里正在出手的人会被抖得动作中断；越熟练（等级越高）越容易抖断，深源式再降一级。"
            }),
        /** 震波道数：3 + 物攻 ×0.02；夹 3..7。同时驱动画面里颤动的道数。 */
        crests: formula(
            F.base(3).plus(F.stat("attack").times(0.02)).clamp(3, 7).round(0),
            "震波道数", {
                unit: "道",
                description: "地面连颤几道；随物攻增长，也决定画面里扬尘的层数与密度。"
            }),
        /** 扬尘量：18 + 物攻 ×0.3 + 体重 ×0.15；夹 12..48。同时驱动画面密度。 */
        dust: formula(
            F.base(18).plus(F.stat("attack").times(0.3)).plus(F.body("weight").times(0.15)).clamp(12, 48).round(0),
            "扬尘量", {
                unit: "点",
                description: "横颤扬起的尘量；物攻与体重越大越多，也决定画面的密集程度。"
            }),
        /** 起手：13 − 速度偏移[−2.5,4] + 深源 4；夹 9..20。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.02).clamp(-2.5, 4))
                .plus(F.when(F.pref("fault", text("worldcombat.skill.magnitude.preference.fault")), F.const(4), F.const(0)))
                .clamp(9, 20).round(0),
            "起手", "沉身压地、等第一道横颤起来需要多久；速度越快越早震，深源式要多蓄一会儿。"),
        /** 收招：8 − 速度偏移[−1,2.5]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.012).clamp(-1, 2.5)).clamp(5, 12).round(0),
            "收招", "震完站定需要多久；速度越快越利落。"),
        /** 冷却：26 − 等级(≥25)偏移[0,8] + 深源 14 / 浅源 −6；夹 14..46。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(25).times(0.12).clamp(0, 8))
                .plus(F.when(F.pref("fault", text("worldcombat.skill.magnitude.preference.fault")), F.const(14), F.const(-6)))
                .clamp(14, 46).round(0),
            "冷却", "两次震之间要等多久；等级越高回手越快，深源式更久、浅源式更短。"),
        maxTargets: hidden(12)
    });

    defineDamage("magnitude", "quake", {});

    stages("magnitude", [
        { level: 42, values: { quake: 86, shudder: 4.2, fracture: 7 } }
    ]);

    describe("magnitude", [
        { key: "description.0", values: ["quake"] },
        { key: "description.1", values: ["shudder","jolt","stagger","maxTargets"] },
        { key: "description.2", values: ["fracture"] },
        { key: "description.3", values: [] },
        { key: "fault.on", values: [], when: function (context) { return read(context.detail.values, ["fault"]) === true; } },
        { key: "fault.off", values: [], when: function (context) { return read(context.detail.values, ["fault"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.quake", "tier.0.shudder", "tier.0.fracture"] }
    ]);
}
