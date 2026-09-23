/**
 * 飞踢 / jumpkick 的参数与伤害段。
 *
 * 原生事实：格斗、物理、威力 100、命中 95、PP 10、接触、gravity，hasCrashDamage（落空自伤半管血）。
 * 翻译：把「高高腾空、用一记飞踢撞向对手，踢偏就自己受伤」落成一次**助跑起跳的低平弧线飞踢**——
 * 起手缩身，随后沿一条浅浅的抛物线冲上前去，腿沿弧线伸出；撞到活体就是接触伤害并把对手踹开，
 * 落点空无一人才是「踢偏」，脚踝硬磕地面，按坠势自伤。命中 95 在本作的即时判定里不掷骰，
 * 而是体现为弧线锁定得较晚、对手横移就能让开。
 *
 * 本招是跳击家族的基准线：飞膝踢、下压踢、闪电强袭都从它出发，各自换掉了弧线的形状与结果。
 * 与最像的飞膝踢分开：飞踢是**前多后少**的低平弧，飞膝踢是**先拔高再直坠**的竖直线。
 *
 * 数据分散（每项依赖不同的精灵数据，是这招区分度的来源）：
 *   kick      踢劲：物攻给狠度、速度给冲势、身高给腿长，助跑配置再加一档。
 *   leapHeight 跃起高度：身高决定能拔多高，原地配置略高。
 *   leapSpeed 上升速度、diveSpeed 俯冲速度：都吃速度，快的个体更快到位也更难被让开。
 *   drift     腾空前移：速度决定上升阶段往前压多少，是低平弧的关键。
 *   reach     施放距离：速度与等级提高距离，也是本招射程来源。
 *   hitRadius 命中半径：碰撞箱高度决定腿扫过多宽。
 *   crash     落空自伤：体重越大、速度越快、防御越低摔得越狠；助跑配置再加一档。
 *   shove     击退：体重与物攻决定把对手踹开多远。
 *   dust      扬尘数量：随体重与物攻增长，粒子按它发射。
 *   tempo/aftercast/recharge 起手、收招与冷却都吃速度，助跑配置拖长起手。
 *
 * 配置 running（助跑起跳）双向取舍：开启＝有助跑，踢劲与射程更高，但起手 +3 刻、落空自伤 +0.03；
 * 关闭＝原地起跳，出手快、自伤轻，但够不远也不够狠。
 *
 * 伤害段 kick：这一踢随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("jumpkick", {
        /** 踢劲：基础 100，物攻每比 60 多 1 加 0.55（夹 -28..50），速度每比 60 快 1 加 0.25（夹 -12..26），身高每比 1.4 高 1 格加 6（夹 -4..12），助跑 +8；夹 66..190。 */
        kick: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-28, 50))
                .plus(F.stat("speed").minus(60).times(0.25).clamp(-12, 26))
                .plus(F.body("height").minus(1.4).times(6).clamp(-4, 12))
                .plus(F.when(F.pref("running"), F.const(8), F.const(0)))
                .clamp(66, 190).round(1),
            "踢劲", {
                unit: "威力",
                description: "腾空飞踢命中那一下的威力；物攻越高越狠、起步越快冲势越足、腿越长扫得越远，助跑再加一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 跃起高度：基础 2.2 格，身高每比 1.4 高 1 格加 0.7（夹 -0.3..1.1），原地起跳 +0.3；夹 1.6..4.2。 */
        leapHeight: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.1))
                .plus(F.when(F.pref("running"), F.const(0), F.const(0.3)))
                .clamp(1.6, 4.2).round(2),
            "跃起高度", {
                unit: "格",
                description: "腾空拔到多高；身量越高拔得越高，原地起跳比助跑略高一点。"
            }),
        /** 上升速度：基础 0.62 格/刻，速度每比 60 快 1 加 0.004（夹 -0.12..0.34）；夹 0.4..1.1。 */
        leapSpeed: formula(
            F.base(0.62).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.4, 1.1).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "起跳爬升的快慢；速度快的个体更快到顶、更难被拦。"
            }),
        /** 俯冲速度：基础 1.05 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.55）；夹 0.65..1.7。 */
        diveSpeed: formula(
            F.base(1.05).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.55)).clamp(0.65, 1.7).round(2),
            "俯冲速度", {
                unit: "格/刻",
                description: "从最高点压向落点的快慢；速度快的个体更快砸到，对手更难在落点前让开。"
            }),
        /** 腾空前移：基础 0.16 格/刻，速度每比 60 快 1 加 0.0015（夹 -0.05..0.14），助跑 +0.08；夹 0.05..0.42。 */
        drift: formula(
            F.base(0.16).plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.05, 0.14))
                .plus(F.when(F.pref("running"), F.const(0.08), F.const(0)))
                .clamp(0.05, 0.42).round(3),
            "腾空前移", {
                unit: "格/刻",
                description: "上升阶段每刻往前压多少；越高越接近低平长弧，速度与助跑让它更长。"
            }),
        /** 施放距离：基础 5.5 格，速度每比 60 快 1 加 0.012（夹 -0.6..1.4），等级每比 25 高 1 加 0.04（夹 0..1.5）；夹 4..9。 */
        reach: formula(
            F.base(5.5).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.6, 1.4))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .clamp(4, 9).round(1),
            "施放距离", {
                unit: "格",
                description: "能起跳够到多远的目标；速度与等级提高距离，也是本招的实际射程来源。"
            }),
        /** 命中半径：基础 0.65 格，身高每比 1.4 高 1 格加 0.18（夹 -0.12..0.4）；夹 0.5..1.15。 */
        hitRadius: formula(
            F.base(0.65).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.12, 0.4)).clamp(0.5, 1.15).round(2),
            "命中半径", {
                unit: "格",
                description: "踢腿扫过多大一圈；身体越高大扫得越宽，落点附近的对手越难躲开。"
            }),
        /** 落空自伤：基础 0.20，体重每比 50 千克重 1 加 0.0008（夹 -0.04..0.08），速度每比 60 快 1 加 0.0006（夹 -0.03..0.05），防御每比 60 高 1 少 0.0005（上限 0.06），助跑 +0.03；夹 0.10..0.34。 */
        crash: formula(
            F.base(0.20)
                .plus(F.body("weight").div(10).minus(50).times(0.0008).clamp(-0.04, 0.08))
                .plus(F.stat("speed").minus(60).times(0.0006).clamp(-0.03, 0.05))
                .minus(F.stat("defence").minus(60).times(0.0005).clamp(0, 0.06))
                .plus(F.when(F.pref("running"), F.const(0.03), F.const(0)))
                .clamp(0.10, 0.34).round(3),
            "落空自伤", {
                unit: "比例",
                description: "踢偏、脚踝硬磕地面时按自身最大生命的比例自伤；身体越沉、冲得越快摔得越狠，腿部防御高则收得住，助跑加重。这是本招的全部风险。"
            }),
        /** 击退：基础 0.6 格，体重每比 50 千克重 1 加 0.006（夹 -0.2..0.7），物攻每比 60 多 1 加 0.004（夹 -0.15..0.5）；夹 0.3..1.8。 */
        shove: formula(
            F.base(0.6).plus(F.body("weight").div(10).minus(50).times(0.006).clamp(-0.2, 0.7))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .clamp(0.3, 1.8).round(2),
            "击退", {
                unit: "格",
                description: "命中后把对手沿飞踢方向踹开多远；越重、物攻越高踹得越远。"
            }),
        /** 扬尘数量：基础 12，体重每比 50 千克重 1 加 0.12（夹 -4..14），物攻每比 60 多 1 加 0.08（夹 -3..10）；夹 8..40。 */
        dust: formula(
            F.base(12).plus(F.body("weight").div(10).minus(50).times(0.12).clamp(-4, 14))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-3, 10)).clamp(8, 40).round(0),
            "扬尘数量", {
                unit: "个",
                description: "起跳、俯冲与落地扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -3..3），助跑 +3；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("running"), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "缩身蓄势到能蹬地起跳的时间；速度越快越短，助跑越长起手越久。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "落地后的收势；速度越快越利落。"),
        /** 冷却：基础 26 刻，速度每比 60 快 1 少 0.03（夹 -5..7）；夹 18..38。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7)).clamp(18, 38).round(0),
            "冷却", "两次飞踢之间的间隔；速度越快回得越快。"),
        traceAhead: hidden(1.4),
        settleSpeed: hidden(0.6)
    });

    stages("jumpkick", [
        { level: 20, values: { kick: 112 } },
        { level: 40, values: { kick: 132, shove: 0.85 } }
    ]);

    defineDamage("jumpkick", "kick", {}, { contact: true });

    describe("jumpkick", [
        { key: "description.0", values: ["kick"] },
        { key: "description.1", values: ["leapHeight", "leapSpeed", "diveSpeed", "drift"] },
        { key: "description.2", values: ["reach","hitRadius","crash"] },
        { key: "description.aim", values: [] },
        { key: "description.3", values: ["shove"] },
        { key: "running.on", values: [], when: function (context) { return read(context.detail.values, ["running"]) === true; } },
        { key: "running.off", values: [], when: function (context) { return read(context.detail.values, ["running"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.shove"] }
    ]);
}
