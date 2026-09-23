/**
 * 闪电强袭 / supercellslam 的参数与伤害段。
 *
 * 原生事实：电、物理、威力 100、命中 95、PP 15、接触，hasCrashDamage（落空自伤半管血）。
 * 翻译：把「让身体带电后压向对方，没命中则自己受伤」翻成一次**蓄电—下坠**的电击落体——
 * 起手让身体带电（电荷随蓄电配置累积），随后腾空压向对手；命中时把电荷在落点一次放掉（电流迸发），
 * 落空则是带电的身体砸在地上，电荷反噬自己。它是跳击家族里唯一带电、唯一的远程属性伤害。
 *
 * 与同族分开：飞踢、飞膝踢、下压踢都是纯格斗；本招的签名是**升空期间不断叠加的电荷**与落点那一下放电，
 * 画面是电黄近白，而非格斗的暖色。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   slam      强袭威力：物攻给狠度、速度给冲势、体重给份量，蓄电配置再乘一档。
 *   leapHeight 腾起高度：身高决定能拔多高。
 *   leapSpeed/diveSpeed 上升与下坠速度：都吃速度，蓄电越多坠得越快（电得更沉）。
 *   drift     腾空前移：速度决定前压多少。
 *   reach     施放距离：速度与等级提高距离，蓄电越多射程略短（蓄得越久对手越有时间让开）。
 *   hitRadius 放电半径：身高决定电到多大一圈。
 *   crash     落空自伤：体重、速度、蓄电都加重，防御减轻。
 *   sparks    电花数量：随物攻与蓄电增长，粒子按它发射。
 *   shove/dust 击退与扬尘：体重与物攻。
 *   tempo/aftercast/recharge 起手、收招与冷却，蓄电越多起手与冷却越久。
 *
 * 配置 charge（蓄电，0..3 级）双向取舍：蓄得越多，强袭威力、电花数量、下坠速度与落空自伤都涨，
 * 但起手与冷却更久、射程略短；0 级是快速轻坠，够得远、出手快、自伤轻但电得不狠。
 *
 * 伤害段 slam：这一击随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("supercellslam", {
        /** 强袭威力：基础 100，物攻每比 60 多 1 加 0.5（夹 -25..45），速度每比 60 快 1 加 0.25（夹 -12..26），体重每比 50 千克重 1 加 0.15（夹 -6..18）；蓄电每级 ×1.07；夹 66..200。 */
        slam: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-25, 45))
                .plus(F.stat("speed").minus(60).times(0.25).clamp(-12, 26))
                .plus(F.body("weight").div(10).minus(50).times(0.15).clamp(-6, 18))
                .times(F.const(1).plus(F.pref("charge").times(0.07)))
                .clamp(66, 200).round(1),
            "强袭威力", {
                unit: "威力",
                description: "带电身体压中那一下的威力；物攻越高越狠、下坠越快冲势越足、身体越沉越有份量，蓄电越多电得越狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 腾起高度：基础 2.6 格，身高每比 1.4 高 1 格加 0.7（夹 -0.3..1.2）；夹 1.8..4.6。 */
        leapHeight: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.2)).clamp(1.8, 4.6).round(2),
            "腾起高度", {
                unit: "格",
                description: "带电腾起多高；身量越高拔得越高。"
            }),
        /** 上升速度：基础 0.6 格/刻，速度每比 60 快 1 加 0.004（夹 -0.12..0.34）；夹 0.4..1.1。 */
        leapSpeed: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.4, 1.1).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "带电爬升的快慢；速度快的个体更快到顶。"
            }),
        /** 下坠速度：基础 1.0 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.55），蓄电每级 +0.05；夹 0.65..1.8。 */
        diveSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.55))
                .plus(F.pref("charge").times(0.05))
                .clamp(0.65, 1.8).round(2),
            "下坠速度", {
                unit: "格/刻",
                description: "从空中压下的快慢；速度快的个体更难被让开，蓄电越多坠得越快越沉。"
            }),
        /** 腾空前移：基础 0.14 格/刻，速度每比 60 快 1 加 0.0015（夹 -0.05..0.14）；夹 0.05..0.40。 */
        drift: formula(
            F.base(0.14).plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.05, 0.14)).clamp(0.05, 0.40).round(3),
            "腾空前移", {
                unit: "格/刻",
                description: "上升阶段每刻往前压多少；速度越快压得越远。"
            }),
        /** 施放距离：基础 5.5 格，速度每比 60 快 1 加 0.012（夹 -0.6..1.4），等级每比 25 高 1 加 0.04（夹 0..1.5），蓄电每级 -0.2；夹 4..9。 */
        reach: formula(
            F.base(5.5).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.6, 1.4))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .minus(F.pref("charge").times(0.2))
                .clamp(4, 9).round(1),
            "施放距离", {
                unit: "格",
                description: "能带电压到多远的目标；速度与等级提高距离，蓄电越多略短（蓄得越久对手越有时间让开），也是本招的实际射程来源。"
            }),
        /** 放电半径：基础 0.7 格，身高每比 1.4 高 1 格加 0.2（夹 -0.12..0.45）；夹 0.52..1.25。 */
        hitRadius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.12, 0.45)).clamp(0.52, 1.25).round(2),
            "放电半径", {
                unit: "格",
                description: "落地放电电到多大一圈；身体越高大电得越宽。"
            }),
        /** 落空自伤：基础 0.20，体重每比 50 千克重 1 加 0.0008（夹 -0.04..0.08），速度每比 60 快 1 加 0.0006（夹 -0.03..0.05），防御每比 60 高 1 少 0.0005（上限 0.06），蓄电每级 +0.01；夹 0.10..0.40。 */
        crash: formula(
            F.base(0.20)
                .plus(F.body("weight").div(10).minus(50).times(0.0008).clamp(-0.04, 0.08))
                .plus(F.stat("speed").minus(60).times(0.0006).clamp(-0.03, 0.05))
                .minus(F.stat("defence").minus(60).times(0.0005).clamp(0, 0.06))
                .plus(F.pref("charge").times(0.01))
                .clamp(0.10, 0.40).round(3),
            "落空自伤", {
                unit: "比例",
                description: "带电身体砸在地上时按自身最大生命的比例自伤；身体越沉、坠得越快、蓄电越多越狠，防御高则收得住。这是蓄电玩法的代价。"
            }),
        /** 电花数量：基础 18，物攻每比 60 多 1 加 0.2（夹 -6..16），蓄电每级 +8；夹 12..60。 */
        sparks: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 16))
                .plus(F.pref("charge").times(8)).clamp(12, 60).round(0),
            "电花数量", {
                unit: "个",
                description: "落点迸发的电花数量，随物攻与蓄电增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 击退：基础 0.55 格，体重每比 50 千克重 1 加 0.006（夹 -0.2..0.7），物攻每比 60 多 1 加 0.004（夹 -0.15..0.5）；夹 0.3..1.7。 */
        shove: formula(
            F.base(0.55).plus(F.body("weight").div(10).minus(50).times(0.006).clamp(-0.2, 0.7))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .clamp(0.3, 1.7).round(2),
            "击退", {
                unit: "格",
                description: "命中后把对手沿下坠方向顶开多远；越重、物攻越高推得越远。"
            }),
        /** 扬尘数量：基础 14，体重每比 50 千克重 1 加 0.12（夹 -4..14），物攻每比 60 多 1 加 0.08（夹 -3..10）；夹 8..42。 */
        dust: formula(
            F.base(14).plus(F.body("weight").div(10).minus(50).times(0.12).clamp(-4, 14))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-3, 10)).clamp(8, 42).round(0),
            "扬尘数量", {
                unit: "个",
                description: "起跳与落地扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -3..3），蓄电每级 +2；夹 4..16。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.pref("charge").times(2)).clamp(4, 16).round(0),
            "起手", "带电蓄势到能腾起的时间；速度越快越短，蓄电越多越久。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "落地放电后的收势；速度越快越利落。"),
        /** 冷却：基础 28 刻，速度每比 60 快 1 少 0.03（夹 -5..7），蓄电每级 +3；夹 18..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7))
                .plus(F.pref("charge").times(3)).clamp(18, 42).round(0),
            "冷却", "两次强袭之间的间隔；速度越快回得越快，蓄电越多越久。"),
        traceAhead: hidden(1.4),
        settleSpeed: hidden(0.6)
    });

    stages("supercellslam", [
        { level: 30, values: { slam: 116 } },
        { level: 50, values: { slam: 136, shove: 0.85 } }
    ]);

    defineDamage("supercellslam", "slam", {}, { contact: true });

    describe("supercellslam", [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["leapHeight", "leapSpeed", "diveSpeed", "drift"] },
        { key: "description.2", values: ["reach","hitRadius","crash"] },
        { key: "description.aim", values: [] },
        { key: "description.3", values: ["shove"] },
        { key: "description.4", values: ["pref.charge"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.shove"] }
    ]);
}
