/**
 * 飞膝踢 / highjumpkick 的参数与伤害段。
 *
 * 原生事实：格斗、物理、威力 130、命中 90、PP 10、接触、gravity，hasCrashDamage（落空自伤半管血）。
 * 翻译：把「跳起后用膝盖撞对手，撞偏就自己受伤」翻成一次**先垂直拔高、再直坠落膝**的重击——
 * 起手压腿蓄力，随即几乎直线拔上高空，在顶点短暂滞空、把落点钉死（这一刻对手能读到你砸向哪里），
 * 然后膝头朝下砸进落点。命中是最重的一记接触伤害；砸空就是整条腿硬磕地面，自伤最狠。
 *
 * 与最像的飞踢分开：飞踢是**前多后少**的低平弧，飞膝踢是**先拔高再直坠**的竖直线——顶点停滞与直坠是它的签名。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   knee      膝劲：物攻给狠度、体重给份量、速度给下坠冲势；垂直形态再乘一档。
 *   leapHeight 拔高：身高决定能拔多高，垂直形态再抬一截。
 *   leapSpeed/diveSpeed 上升与下坠速度：都吃速度。
 *   drift     腾空前移：垂直形态几乎为零，斜向形态才往前压。
 *   reach     施放距离：速度与等级提高距离；垂直形态换得更短。
 *   hitRadius 膝击判定半径：身高决定膝头压住多大一圈。
 *   crash     落空自伤：体重、速度、垂直形态都加重，防御减轻——本招最狠的代价。
 *   shove     击退、dust 扬尘：体重与物攻。
 *   holdTicks 顶点滞空：给对手一个读落点的窗口，也是本招可被让开的原因。
 *   tempo/aftercast/recharge 起手、收招与冷却，垂直形态整体更慢。
 *
 * 配置 vertical（垂直落膝）双向取舍：开启＝拔得更高、膝劲 ×1.08、下坠更快、自伤更重，但起手更久、
 * 冷却更长、射程更短、顶点停滞更久；关闭＝斜向飞膝，够得更远、更快、更轻。
 *
 * 伤害段 knee：这一膝随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("highjumpkick", {
        /** 膝劲：基础 130，物攻每比 60 多 1 加 0.6（夹 -30..55），体重每比 50 千克重 1 加 0.3（夹 -15..30），速度每比 60 快 1 加 0.2（夹 -10..20）；垂直 ×1.08；夹 96..210。 */
        knee: formula(
            F.base(130)
                .plus(F.stat("attack").minus(60).times(0.6).clamp(-30, 55))
                .plus(F.body("weight").div(10).minus(50).times(0.3).clamp(-15, 30))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-10, 20))
                .times(F.when(F.pref("vertical"), F.const(1.08), F.const(1)))
                .clamp(96, 210).round(1),
            "膝劲", {
                unit: "威力",
                description: "膝头砸中那一下的威力；物攻越高越狠、身体越沉越有份量、下坠越快冲势越足，垂直落膝再乘一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拔高：基础 3.6 格，身高每比 1.4 高 1 格加 0.9（夹 -0.4..1.4），垂直 +1.2；夹 2.4..5.6。 */
        leapHeight: formula(
            F.base(3.6).plus(F.body("height").minus(1.4).times(0.9).clamp(-0.4, 1.4))
                .plus(F.when(F.pref("vertical"), F.const(1.2), F.const(0)))
                .clamp(2.4, 5.6).round(2),
            "拔高", {
                unit: "格",
                description: "起跳拔到多高；身量越高拔得越高，垂直落膝再抬一截，也越难在半空被拦。"
            }),
        /** 上升速度：基础 0.66 格/刻，速度每比 60 快 1 加 0.004（夹 -0.12..0.34）；夹 0.42..1.1。 */
        leapSpeed: formula(
            F.base(0.66).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.42, 1.1).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "拔升的快慢；速度快的个体更快到顶。"
            }),
        /** 下坠速度：基础 1.15 格/刻，速度每比 60 快 1 加 0.007（夹 -0.2..0.6），垂直 +0.15；夹 0.7..1.9。 */
        diveSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.2, 0.6))
                .plus(F.when(F.pref("vertical"), F.const(0.15), F.const(0)))
                .clamp(0.7, 1.9).round(2),
            "下坠速度", {
                unit: "格/刻",
                description: "从顶点直坠的速度；速度快的个体更难被让开，垂直落膝再快一档。"
            }),
        /** 腾空前移：基础 0.10 格/刻，速度每比 60 快 1 加 0.0012（夹 -0.04..0.1）；垂直 ×0.35，斜向 +0.10；夹 0.02..0.40。 */
        drift: formula(
            F.base(0.10).plus(F.stat("speed").minus(60).times(0.0012).clamp(-0.04, 0.1))
                .times(F.when(F.pref("vertical"), F.const(0.35), F.const(1)))
                .plus(F.when(F.pref("vertical"), F.const(0), F.const(0.10)))
                .clamp(0.02, 0.40).round(3),
            "腾空前移", {
                unit: "格/刻",
                description: "上升阶段每刻往前压多少；垂直落膝几乎原地拔高，斜向飞膝才向前够人。"
            }),
        /** 施放距离：基础 5.0 格，速度每比 60 快 1 加 0.01（夹 -0.5..1.2），等级每比 25 高 1 加 0.03（夹 0..1.2）；垂直 -1.0，斜向 +0.4；夹 3.5..8.5。 */
        reach: formula(
            F.base(5.0).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.5, 1.2))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .plus(F.when(F.pref("vertical"), F.const(-1.0), F.const(0.4)))
                .clamp(3.5, 8.5).round(1),
            "施放距离", {
                unit: "格",
                description: "能拔到多远的目标头上；速度与等级提高距离，垂直形态换来更短的射程，也是本招的实际射程来源。"
            }),
        /** 膝击判定：基础 0.7 格，身高每比 1.4 高 1 格加 0.2（夹 -0.12..0.45），垂直 +0.05；夹 0.52..1.3。 */
        hitRadius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.12, 0.45))
                .plus(F.when(F.pref("vertical"), F.const(0.05), F.const(0)))
                .clamp(0.52, 1.3).round(2),
            "膝击判定", {
                unit: "格",
                description: "膝头压住多大一圈；身体越高大压得越宽，垂直落膝略宽。"
            }),
        /** 落空自伤：基础 0.28，体重每比 50 千克重 1 加 0.001（夹 -0.05..0.1），速度每比 60 快 1 加 0.0008（夹 -0.04..0.06），防御每比 60 高 1 少 0.0006（上限 0.07），垂直 +0.06；夹 0.14..0.45。 */
        crash: formula(
            F.base(0.28)
                .plus(F.body("weight").div(10).minus(50).times(0.001).clamp(-0.05, 0.1))
                .plus(F.stat("speed").minus(60).times(0.0008).clamp(-0.04, 0.06))
                .minus(F.stat("defence").minus(60).times(0.0006).clamp(0, 0.07))
                .plus(F.when(F.pref("vertical"), F.const(0.06), F.const(0)))
                .clamp(0.14, 0.45).round(3),
            "落空自伤", {
                unit: "比例",
                description: "砸偏、整条腿硬磕地面时按自身最大生命的比例自伤；身体越沉、坠得越快越狠，腿部防御高则收得住，垂直落膝代价最大。这是本招最主要的风险。"
            }),
        /** 击退：基础 0.5 格，体重每比 50 千克重 1 加 0.006（夹 -0.2..0.7），物攻每比 60 多 1 加 0.004（夹 -0.15..0.5）；夹 0.25..1.6。 */
        shove: formula(
            F.base(0.5).plus(F.body("weight").div(10).minus(50).times(0.006).clamp(-0.2, 0.7))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .clamp(0.25, 1.6).round(2),
            "击退", {
                unit: "格",
                description: "命中后把对手沿坠击方向撞开多远；越重、物攻越高撞得越远。"
            }),
        /** 扬尘数量：基础 16，体重每比 50 千克重 1 加 0.12（夹 -4..16），物攻每比 60 多 1 加 0.08（夹 -3..10）；夹 10..46。 */
        dust: formula(
            F.base(16).plus(F.body("weight").div(10).minus(50).times(0.12).clamp(-4, 16))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-3, 10)).clamp(10, 46).round(0),
            "扬尘数量", {
                unit: "个",
                description: "起跳、顶点与落地扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 顶点滞空：基础 4 刻，垂直 +3；夹 3..10。 */
        holdTicks: formula(
            F.base(4).plus(F.when(F.pref("vertical"), F.const(3), F.const(0))).clamp(3, 10).round(0),
            "顶点滞空", {
                unit: "刻",
                description: "在最高点悬停多久再直坠；这段时间把落点画给对手看，也是对手让开的机会，垂直形态停得更久。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 少 0.02（夹 -3..3），垂直 +2；夹 5..16。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("vertical"), F.const(2), F.const(0)))
                .clamp(5, 16).round(0),
            "起手", "压腿蓄力到能拔地而起的时间；速度越快越短，垂直落膝更久。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 少 0.02（夹 -3..3），垂直 +1；夹 5..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("vertical"), F.const(1), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "落地后的收势；速度越快越利落，垂直落膝略久。"),
        /** 冷却：基础 30 刻，速度每比 60 快 1 少 0.03（夹 -5..7），垂直 +8；夹 20..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7))
                .plus(F.when(F.pref("vertical"), F.const(8), F.const(0)))
                .clamp(20, 46).round(0),
            "冷却", "两次飞膝之间的间隔；速度越快回得越快，垂直落膝代价更长。"),
        traceAhead: hidden(1.4),
        settleSpeed: hidden(0.6)
    });

    stages("highjumpkick", [
        { level: 35, values: { knee: 148 } },
        { level: 55, values: { knee: 170, leapHeight: 4.4 } }
    ]);

    defineDamage("highjumpkick", "knee", {}, { contact: true });

    describe("highjumpkick", [
        { key: "description.0", values: ["knee"] },
        { key: "description.1", values: ["leapHeight", "leapSpeed", "diveSpeed", "drift"] },
        { key: "description.2", values: ["reach","hitRadius","crash"] },
        { key: "description.3", values: ["holdTicks","shove"] },
        { key: "vertical.on", values: [], when: function (context) { return read(context.detail.values, ["vertical"]) === true; } },
        { key: "vertical.off", values: [], when: function (context) { return read(context.detail.values, ["vertical"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.knee"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.knee", "tier.1.leapHeight"] }
    ]);
}
