/**
 * 破音 / overdrive 的参数与伤害段。
 *
 * 原生事实：Electric／特殊／威力 80／命中 100／PP 10／优先度 0／flags sound+bypasssub／
 *   target allAdjacentFoes／无次要效果；「奏响吉他和贝斯，释放出发出巨响的剧烈震动」。
 *
 * 翻译：把「弹奏乐器发出的巨大回声与震动」翻成**沿一条直线连弹三下的电声乐句**——施法者扎住脚，
 *   朝正前方拨响三下，每一下都沿同一条走廊推出一道带电的声浪：走廊里的每个敌人各挨一次 `thrum`
 *   并被打得后退半步；电声每一下都可能把人震到**麻痹**（Electre 属性免疫，与原作一致）。
 *   响铃式配置会再多出一记迟到的**余响**——那是原生的「巨大回声」，更重、也多一次麻痹机会，代价是
 *   整段演出更长、冷却更久。
 *   与同族分开：
 *     虫鸣（bugbuzz）—— 锥形、越远越弱、碾特防；
 *     刺耳声（screech）—— 细走廊、只一下、降物防；
 *     闪焰高歌（torchsong）—— 火焰锥、多段、提高自己特攻；
 *     破音（本招）    —— 一条直线走廊、连续三下、电声概率麻痹（+ 可选的迟到余响），唯一带电的一声。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   thrum        每一下威力 27 + 特攻偏移 + 等级偏移（乐手越强每一下越重）；余响式 ×0.82（把总量摊到更多下）。
 *   reach        走廊长度 6.5 + 特攻偏移 + 等级偏移（声音送得越远）。
 *   width        走廊半宽 0.9 + 体重偏移（身体越沉、共鸣箱越大，走廊越宽）。
 *   push         每下推退 0.28 格 + 特攻偏移（震得越狠退得越多）。
 *   paralyzeChance 麻痹概率 0.08 + 特攻偏移（电声越强越容易震麻），夹 0.04..0.2。
 *   paralyzeTicks  麻痹停留 200 刻 + 特攻偏移 + 等级偏移。
 *   interval     两下之间 6 刻 − 速度偏移（手快的个体连弹更紧）。
 *   echoRatio    余响倍率：余响式 1.05，关闭 0（不出余响）。
 *   tempo／settle／recharge 起手／收招／冷却随速度；余响式冷却更久。
 *
 * 配置 `echo`（余响）：开启＝拨完三下后 `echoGap` 刻再来一记更重的迟到声浪（原生「巨大回声」），
 *   多一次麻痹机会；关闭＝三下紧凑收束。两向各有局面：想赌状态、啃硬目标就开余响；想快进快出就关。
 *
 * 伤害段 `thrum` 与参数同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("overdrive", {
        /** 每一下威力：27 + 特攻偏移[−8,18] + 等级(≥30)偏移[0,4]；余响 ×0.82 / 紧凑 ×1.0；夹 18..70。 */
        thrum: formula(
            F.base(27)
                .plus(F.stat("specialAttack").minus(70).times(0.15).clamp(-8, 18))
                .plus(F.level().minus(30).times(0.06).clamp(0, 4))
                .times(F.when(F.pref("echo"), F.const(0.82), F.const(1.0)))
                .clamp(18, 70).round(1),
            "每下威力", {
                unit: "威力",
                description: "三下里每一下的基础威力；特攻越高、等级越高每一下越重（余响式把总量摊到更多下）。对手特防、相性与暴击在命中时另算。"
            }),
        /** 走廊长度：6.5 + 特攻偏移[−1,2.4] + 等级(≥30)偏移[0,1.4]；夹 4.5..11。 */
        reach: formula(
            F.base(6.5)
                .plus(F.stat("specialAttack").minus(70).times(0.02).clamp(-1, 2.4))
                .plus(F.level().minus(30).times(0.04).clamp(0, 1.4))
                .clamp(4.5, 11).round(2),
            "走廊长度", {
                unit: "格",
                description: "电声乐句推出去多远；特攻越高、等级越高送得越远，也是本招的实际射程与指示走廊长度。"
            }),
        /** 走廊半宽：0.9 + 体重偏移[−0.2,0.7]；夹 0.6..1.8。 */
        width: formula(
            F.base(0.9).plus(F.body("weight").minus(400).times(0.0009).clamp(-0.2, 0.7)).clamp(0.6, 1.8).round(2),
            "走廊半宽", {
                unit: "格",
                description: "走廊一侧到中线的宽度；身体越沉、共鸣箱越大的个体走廊越宽，一行里并排的人更容易一起被震到。"
            }),
        /** 每下推退：0.28 + 特攻偏移[−0.06,0.28]；夹 0.12..0.7。 */
        push: formula(
            F.base(0.28).plus(F.stat("specialAttack").minus(70).times(0.002).clamp(-0.06, 0.28)).clamp(0.12, 0.7).round(2),
            "每下推退", {
                unit: "格",
                description: "每一下把走廊里的人沿声浪方向推退半步的距离；特攻越高震得越远，三下会一路叠加。"
            }),
        /** 麻痹概率：0.08 + 特攻偏移[−0.02,0.1]；夹 0.04..0.2。 */
        paralyzeChance: percent(
            F.base(0.08).plus(F.stat("specialAttack").minus(70).times(0.0008).clamp(-0.02, 0.1)).clamp(0.04, 0.2).round(3),
            "麻痹概率", "每一下命中时把电声震进对方神经、造成麻痹的概率；特攻越高越容易震麻。电属性免疫这个结果，与原作一致。"),
        /** 麻痹停留：200 刻 + 特攻偏移[−40,120] + 等级(≥30)偏移[0,40]；夹 120..420。 */
        paralyzeTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(70).times(1.0).clamp(-40, 120))
                .plus(F.level().minus(30).times(0.8).clamp(0, 40)).clamp(120, 420).round(0),
            "麻痹停留", "被震麻之后麻痹这个共享状态停留多久；特攻越高、等级越高麻得越久。三下与余响各掷一次。"),
        /** 余响倍率：余响式 1.05 / 紧凑 0。 */
        echoRatio: formula(
            F.when(F.pref("echo"), F.const(1.05), F.const(0)),
            "余响倍率", {
                unit: "倍",
                description: "迟到的余响相对每一下威力的倍率；开启余响才有这一下，关闭时为 0（不出余响）。"
            }),
        /** 余响间隔：22 刻；固定协议。 */
        echoGap: hidden(22),
        /** 两下之间：6 刻 − 速度偏移[−2,3]；夹 3..9。 */
        interval: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(3, 9).round(0),
            "拨弦间隔", "三下之间每两下的间隔；手快的个体连弹更紧，让整段乐句更快打完。"),
        /** 起手：9 刻 − 速度偏移[−2,4]；夹 5..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4)).clamp(5, 13).round(0),
            "起手", "扎住脚、把乐器提到身前并拨响第一下的时间；速度快的个体起得更利落。"),
        /** 收招：8 刻；夹 5..14。 */
        settle: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(0.6).clamp(-1, 3)).clamp(5, 14).round(0),
            "收招", "拨完最后一下之后收势的时间；身板大的个体收得稍慢。"),
        /** 冷却：26 刻 − 速度偏移[−5,7] + 余响 8 刻；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.1).clamp(-5, 7))
                .plus(F.when(F.pref("echo"), F.const(8), F.const(0))).clamp(18, 40).round(0),
            "冷却", "两次破音之间的等待；速度快的个体回得更快，余响式多演一段、回得更慢。"),
        maxTargets: hidden(6)
    });

    defineDamage("overdrive", "thrum", {});

    stages("overdrive", [
        { level: 50, values: { thrum: 40, reach: 8.0, paralyzeChance: 0.12 } }
    ]);

    describe("overdrive", [
        { key: "description.0", values: ["thrum","paralyzeChance","maxTargets"] },
        { key: "description.1", values: ["reach","width","interval"] },
        { key: "description.2", values: ["push","paralyzeTicks"] },
        { key: "echo.on", values: ["echoRatio"], when: function (context) { return read(context.detail.values, ["echo"]) === true; } },
        { key: "echo.off", values: [], when: function (context) { return read(context.detail.values, ["echo"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.thrum", "tier.0.reach", "tier.0.paralyzeChance"] }
    ]);
}
