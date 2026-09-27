/**
 * 闪电强袭 / supercellslam 的参数与伤害段。
 *
 * 原生事实：电、物理、威力 100、命中 95、PP 15、接触，hasCrashDamage（落空自伤半管血）。
 * 翻译：一次由玩家控制的**短跳蓄电—松手压坠**——按住技能键真实起跳，脚底离地后按真实滞空时长攒档，
 * 松开（或满档自动）那一刻才锁准线，带着已蓄的电荷斜坠撞上第一个敌人；撞空则带电身体砸地反噬。
 *
 * 与同族分开：其余跳击锁线即发、没有可控的滞空窗口；本招的签名是**离地时长决定三档电荷**，
 * 玩家决定蓄多久、往哪一次落撞，而不是提交预设档位。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   slam      强袭威力：物攻给狠度、速度给冲势、体重给份量；满档为原设计最强值，实际按蓄电档位 .65/.82/1 结算。
 *   hold1..3  三档的离地时长（协议常量）：6/12/18 刻，分别给 .65/.82/1 倍威力，满档自动压坠。
 *   leapHeight 短跳高度：身高决定能拔多高，头顶净空不足则拔不高、不积电。
 *   leapSpeed/diveSpeed 上升与下坠速度：都吃速度。
 *   drift     腾空前移：速度决定蓄电期间往前压多少。
 *   reach     施放距离：速度与等级提高距离，也是落点收束的最大水平距离。
 *   hitRadius 撞击半径：身高决定撞到多大范围。
 *   crash     落空自伤：体重、速度都加重，防御减轻。这是蓄电玩法的代价。
 *   sparks    电花数量：随物攻增长，落点粒子按它发射，再按蓄电档位放大。
 *   shove/dust 击退与扬尘：体重与物攻。
 *   tempo/aftercast/recharge 起手、收招与冷却。
 *
 * 三档电荷（.65/.82/1）由真实离地时长决定，不设配置项；满档威力为原设计最强单体威力（旧三档倍率已折入基础式），
 * 低档只弱化威力，不额外叠旧倍率。
 */

namespace PokemonSkills {
    actionParameters.define("supercellslam", {
        /** 强袭威力：基础 100，物攻每比 60 多 1 加 0.5（夹 -25..45），速度每比 60 快 1 加 0.25（夹 -12..26），体重每比 50 千克重 1 加 0.15（夹 -6..18）；乘满档系数 1.21（原最强档），夹 66..200。实际命中再按蓄电档位 .65/.82/1 结算。 */
        slam: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-25, 45))
                .plus(F.stat("speed").minus(60).times(0.25).clamp(-12, 26))
                .plus(F.body("weight").div(10).minus(50).times(0.15).clamp(-6, 18))
                .times(1.21)
                .clamp(66, 200).round(1),
            "满档强袭威力", {
                unit: "威力",
                description: "满档带电压中那一下的威力；物攻越高越狠、下坠越快冲势越足、身体越沉越有份量。实际命中按蓄电档位乘 .65／.82／1，对手防御、相性与暴击另算。"
            }),
        /** 首档蓄电：离地 6 刻（0.3 秒）。 */
        hold1: seconds(
            F.base(6),
            "首档蓄电", "脚底离地多少刻蓄到第一档：威力按 .65 结算的起点。"),
        /** 次档蓄电：离地 12 刻（0.6 秒）。 */
        hold2: seconds(
            F.base(12),
            "次档蓄电", "脚底离地多少刻蓄到第二档：威力按 .82 结算。"),
        /** 满档蓄电：离地 18 刻（0.9 秒）。 */
        hold3: seconds(
            F.base(18),
            "满档蓄电", "脚底离地多少刻蓄满并自动压坠：威力按 1 结算，也是单次滞空的上限。"),
        /** 短跳高度：基础 2.6 格，身高每比 1.4 高 1 格加 0.7（夹 -0.3..1.2）；夹 1.8..4.6。 */
        leapHeight: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.2)).clamp(1.8, 4.6).round(2),
            "短跳高度", {
                unit: "格",
                description: "带电短跳起来多高；身量越高拔得越高。头顶净空不足时会压低，压到离不了地就完全蓄不上电。"
            }),
        /** 上升速度：基础 0.6 格/刻，速度每比 60 快 1 加 0.004（夹 -0.12..0.34）；夹 0.4..1.1。 */
        leapSpeed: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.4, 1.1).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "带电爬升的快慢；速度快的个体更快离地进入蓄电。"
            }),
        /** 下坠速度：基础 1.0 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.55）；夹 0.65..1.8。 */
        diveSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.55)).clamp(0.65, 1.8).round(2),
            "下坠速度", {
                unit: "格/刻",
                description: "松开后从空中压下的快慢；速度快的个体更难被让开。"
            }),
        /** 腾空前移：基础 0.14 格/刻，速度每比 60 快 1 加 0.0015（夹 -0.05..0.14）；夹 0.05..0.40。 */
        drift: formula(
            F.base(0.14).plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.05, 0.14)).clamp(0.05, 0.40).round(3),
            "腾空前移", {
                unit: "格/刻",
                description: "蓄电期间每刻沿当前准线往前压多少；速度越快压得越远。"
            }),
        /** 施放距离：基础 5.5 格，速度每比 60 快 1 加 0.012（夹 -0.6..1.4），等级每比 25 高 1 加 0.04（夹 0..1.5）；夹 4..9。 */
        reach: formula(
            F.base(5.5).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.6, 1.4))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .clamp(4, 9).round(1),
            "施放距离", {
                unit: "格",
                description: "能带电压到多远的目标，也是落点水平方向收束的最大距离；速度与等级提高距离。"
            }),
        /** 撞击半径：基础 0.7 格，身高每比 1.4 高 1 格加 0.2（夹 -0.12..0.45）；夹 0.52..1.25。 */
        hitRadius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.12, 0.45)).clamp(0.52, 1.25).round(2),
            "撞击半径", {
                unit: "格",
                description: "下坠身体撞到的范围；身体越高大撞得越宽。"
            }),
        /** 落空自伤：基础 0.20，体重每比 50 千克重 1 加 0.0008（夹 -0.04..0.08），速度每比 60 快 1 加 0.0006（夹 -0.03..0.05），防御每比 60 高 1 少 0.0005（上限 0.06）；夹 0.10..0.40。 */
        crash: formula(
            F.base(0.20)
                .plus(F.body("weight").div(10).minus(50).times(0.0008).clamp(-0.04, 0.08))
                .plus(F.stat("speed").minus(60).times(0.0006).clamp(-0.03, 0.05))
                .minus(F.stat("defence").minus(60).times(0.0005).clamp(0, 0.06))
                .clamp(0.10, 0.40).round(3),
            "落空自伤", {
                unit: "比例",
                description: "带电身体砸在地上时按自身最大生命的比例自伤；身体越沉、坠得越快越狠，防御高则收得住。这是蓄电玩法的代价。"
            }),
        /** 电花数量：基础 18，物攻每比 60 多 1 加 0.2（夹 -6..16）；夹 12..60。 */
        sparks: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 16)).clamp(12, 60).round(0),
            "电花数量", {
                unit: "个",
                description: "落点迸发的电花数量，随物攻增长、按蓄电档位放大；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 击退：基础 0.55 格，体重每比 50 千克重 1 加 0.006（夹 -0.2..0.7），物攻每比 60 多 1 加 0.004（夹 -0.15..0.5）；夹 0.3..1.7。 */
        shove: formula(
            F.base(0.55).plus(F.body("weight").div(10).minus(50).times(0.006).clamp(-0.2, 0.7))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .clamp(0.3, 1.7).round(2),
            "击退", {
                unit: "格",
                description: "命中后把对手沿下坠方向顶开多远；越重、物攻越高推得越远，原生抗击退照常生效。"
            }),
        /** 扬尘数量：基础 14，体重每比 50 千克重 1 加 0.12（夹 -4..14），物攻每比 60 多 1 加 0.08（夹 -3..10）；夹 8..42。 */
        dust: formula(
            F.base(14).plus(F.body("weight").div(10).minus(50).times(0.12).clamp(-4, 14))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-3, 10)).clamp(8, 42).round(0),
            "扬尘数量", {
                unit: "个",
                description: "起跳与落地扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 4..16。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(4, 16).round(0),
            "起手", "带电蓄势到能起跳的时间；速度越快越短。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "落地压击后的收势；速度越快越利落。"),
        /** 冷却：基础 28 刻，速度每比 60 快 1 少 0.03（夹 -5..7）；夹 18..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7)).clamp(18, 42).round(0),
            "冷却", "两次强袭之间的间隔；速度越快回得越快。"),
        settleSpeed: hidden(0.6)
    });

    stages("supercellslam", [
        { level: 30, values: { slam: 116 } },
        { level: 50, values: { slam: 136, shove: 0.85 } }
    ]);

    defineDamage("supercellslam", "slam", {}, { contact: true });

    describe("supercellslam", [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["hold1", "hold2", "hold3"] },
        { key: "description.2", values: ["leapHeight", "leapSpeed", "diveSpeed", "drift"] },
        { key: "description.3", values: ["reach", "crash"] },
        { key: "description.aim", values: [] },
        { key: "description.4", values: ["shove"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.shove"] }
    ]);
}
