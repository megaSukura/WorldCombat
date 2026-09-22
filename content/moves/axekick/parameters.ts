/**
 * 下压踢 / axekick 的参数与伤害段。
 *
 * 原生事实：格斗、物理、威力 120、命中 90、PP 10、接触，30% 概率追加混乱，hasCrashDamage（劈偏自伤半管血）。
 * 翻译：把「把踢起的脚跟往下劈向对手，有时使对手混乱，劈偏就自己受伤」翻成一次**抬腿高劈、脚踵直落的两拍**——
 * 先一脚把腿抬到高处（起手，是对手读得到的预告），再一脚踵朝下劈进对手头顶；劈中会砸乱对手的架势，
 * 有概率把它劈得恍惚（本单元的共享身份 world_combat:status/confusion）。劈空，脚踵砸地、自伤一截。
 *
 * 与同族分开：飞踢、飞膝踢都是整个人腾空飞出去；下压踢几乎原地起落，签名是**抬起→直落的斧劈线**，落地自伤也最轻。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   chop      劈劲：物攻给狠度、速度给下劈冲势、体重给脚跟份量；高劈形态再乘一档。
 *   hopHeight 抬腿高度：身高决定能抬多高，高劈形态再抬一截。
 *   hopSpeed/chopSpeed 起腿与下劈速度：都吃速度。
 *   drift     腾空前移：高劈形态收得更紧，低位形态才向前压。
 *   reach     施放距离：速度与等级提高距离，高劈形态换来更短。
 *   hitRadius 脚踵判定半径：身高决定劈住多大一圈。
 *   crash     落空自伤：体重、速度加重，防御减轻；本族里最轻（起落幅度最小）。
 *   dazeChance 恍惚概率：以特攻为偏移（精神层面的劈击），夹 0.15..0.50。
 *   dazeTicks  恍惚时长：同样吃特攻。
 *   shove/dust 击退与扬尘：体重与物攻。
 *   tempo/aftercast/recharge 起手、收招与冷却，高劈形态整体更慢。
 *
 * 配置 high（高劈）双向取舍：开启＝抬腿更高、劈劲 ×1.08、判定更宽，但起手 +2 刻、冷却 +4 刻、射程 -0.4 格、
 * 落空自伤 +0.03；关闭＝低位快劈，出手快、够得远、自伤轻，但劈不狠也不够宽。
 *
 * 伤害段 chop：这一劈随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("axekick", {
        /** 劈劲：基础 120，物攻每比 60 多 1 加 0.55（夹 -28..50），速度每比 60 快 1 加 0.2（夹 -10..20），体重每比 50 千克重 1 加 0.2（夹 -8..20）；高劈 ×1.08；夹 88..200。 */
        chop: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-28, 50))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-10, 20))
                .plus(F.body("weight").div(10).minus(50).times(0.2).clamp(-8, 20))
                .times(F.when(F.pref("high"), F.const(1.08), F.const(1)))
                .clamp(88, 200).round(1),
            "劈劲", {
                unit: "威力",
                description: "脚跟劈中那一下的威力；物攻越高越狠、下劈越快冲势越足、身体越沉脚跟越重，高劈再乘一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抬腿高度：基础 1.5 格，身高每比 1.4 高 1 格加 0.5（夹 -0.2..0.8），高劈 +0.5；夹 1.1..2.8。 */
        hopHeight: formula(
            F.base(1.5).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .plus(F.when(F.pref("high"), F.const(0.5), F.const(0)))
                .clamp(1.1, 2.8).round(2),
            "抬腿高度", {
                unit: "格",
                description: "把腿抬到多高再劈下；身量越高抬得越高，高劈形态再抬一截，也越难在抬手时被打断。"
            }),
        /** 起腿速度：基础 0.7 格/刻，速度每比 60 快 1 加 0.004（夹 -0.12..0.34）；夹 0.45..1.15。 */
        hopSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.45, 1.15).round(2),
            "起腿速度", {
                unit: "格/刻",
                description: "抬腿拔起多快；速度快的个体更快到顶、更快劈下。"
            }),
        /** 下劈速度：基础 1.3 格/刻，速度每比 60 快 1 加 0.007（夹 -0.2..0.6），高劈 +0.1；夹 0.8..2.0。 */
        chopSpeed: formula(
            F.base(1.3).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.2, 0.6))
                .plus(F.when(F.pref("high"), F.const(0.1), F.const(0)))
                .clamp(0.8, 2.0).round(2),
            "下劈速度", {
                unit: "格/刻",
                description: "脚跟下劈多快；速度快的个体更难被让开，高劈形态更快。"
            }),
        /** 腾空前移：基础 0.10 格/刻，速度每比 60 快 1 加 0.0012（夹 -0.04..0.1）；高劈 ×0.6；夹 0.03..0.28。 */
        drift: formula(
            F.base(0.10).plus(F.stat("speed").minus(60).times(0.0012).clamp(-0.04, 0.1))
                .times(F.when(F.pref("high"), F.const(0.6), F.const(1)))
                .clamp(0.03, 0.28).round(3),
            "腾空前移", {
                unit: "格/刻",
                description: "抬腿阶段每刻往前压多少；高劈收得更紧、更接近原地起落，低位快劈才向前够人。"
            }),
        /** 施放距离：基础 4.2 格，速度每比 60 快 1 加 0.01（夹 -0.5..1.2），等级每比 25 高 1 加 0.03（夹 0..1.2），高劈 -0.4；夹 3..7.5。 */
        reach: formula(
            F.base(4.2).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.5, 1.2))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .plus(F.when(F.pref("high"), F.const(-0.4), F.const(0)))
                .clamp(3, 7.5).round(1),
            "施放距离", {
                unit: "格",
                description: "能劈到多远的对手；速度与等级提高距离，高劈换来更短的射程，也是本招的实际射程来源。"
            }),
        /** 脚踵判定：基础 0.6 格，身高每比 1.4 高 1 格加 0.16（夹 -0.1..0.36），高劈 +0.05；夹 0.45..1.1。 */
        hitRadius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.16).clamp(-0.1, 0.36))
                .plus(F.when(F.pref("high"), F.const(0.05), F.const(0)))
                .clamp(0.45, 1.1).round(2),
            "脚踵判定", {
                unit: "格",
                description: "脚跟劈住多大一圈；身体越高大劈得越宽，高劈形态略宽。"
            }),
        /** 落空自伤：基础 0.17，体重每比 50 千克重 1 加 0.0008（夹 -0.04..0.08），速度每比 60 快 1 加 0.0005（夹 -0.03..0.05），防御每比 60 高 1 少 0.0005（上限 0.06），高劈 +0.03；夹 0.08..0.32。 */
        crash: formula(
            F.base(0.17)
                .plus(F.body("weight").div(10).minus(50).times(0.0008).clamp(-0.04, 0.08))
                .plus(F.stat("speed").minus(60).times(0.0005).clamp(-0.03, 0.05))
                .minus(F.stat("defence").minus(60).times(0.0005).clamp(0, 0.06))
                .plus(F.when(F.pref("high"), F.const(0.03), F.const(0)))
                .clamp(0.08, 0.32).round(3),
            "落空自伤", {
                unit: "比例",
                description: "劈偏、脚踵砸地时按自身最大生命的比例自伤；身体越沉、劈得越快越狠，腿部防御高则收得住。起落幅度最小，所以本族里自伤最轻。"
            }),
        /** 恍惚概率：基础 0.30，特攻每比 60 多 1 加 0.0006（夹 -0.08..0.14）；夹 0.15..0.50。 */
        dazeChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.08, 0.14)).clamp(0.15, 0.50).round(3),
            "恍惚概率", "成功命中后使对手混乱的概率；特攻越高越容易晃晕对手。"),
        fumbleChance: percent(F.const(0.33).clamp(0, 1), "混乱失手率", "陷入混乱后，每次出手失手的概率；与命中后施加混乱的概率分别结算。"),
        /** 恍惚时长：基础 100 刻，特攻每比 60 多 1 加 0.6（夹 -20..40）；夹 60..200。 */
        dazeTicks: formula(
            F.base(100).plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 40)).clamp(60, 200).round(0),
            "恍惚时长", {
                unit: "刻",
                description: "恍惚持续多久；特攻越高晃得越久。"
            }),
        /** 击退：基础 0.4 格，体重每比 50 千克重 1 加 0.005（夹 -0.15..0.6），物攻每比 60 多 1 加 0.003（夹 -0.12..0.4）；夹 0.2..1.3。 */
        shove: formula(
            F.base(0.4).plus(F.body("weight").div(10).minus(50).times(0.005).clamp(-0.15, 0.6))
                .plus(F.stat("attack").minus(60).times(0.003).clamp(-0.12, 0.4))
                .clamp(0.2, 1.3).round(2),
            "击退", {
                unit: "格",
                description: "命中后把对手沿下劈方向撞开多远；越重、物攻越高撞得越远。"
            }),
        /** 扬尘数量：基础 12，体重每比 50 千克重 1 加 0.1（夹 -3..12），物攻每比 60 多 1 加 0.07（夹 -3..9）；夹 8..38。 */
        dust: formula(
            F.base(12).plus(F.body("weight").div(10).minus(50).times(0.1).clamp(-3, 12))
                .plus(F.stat("attack").minus(60).times(0.07).clamp(-3, 9)).clamp(8, 38).round(0),
            "扬尘数量", {
                unit: "个",
                description: "抬腿、下劈与落地扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -3..3），高劈 +2；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("high"), F.const(2), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "抬腿蓄势到能劈下的时间；速度越快越短，高劈更久。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "落地后的收势；速度越快越利落。"),
        /** 冷却：基础 28 刻，速度每比 60 快 1 少 0.03（夹 -5..7），高劈 +4；夹 18..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7))
                .plus(F.when(F.pref("high"), F.const(4), F.const(0))).clamp(18, 42).round(0),
            "冷却", "两次下压踢之间的间隔；速度越快回得越快，高劈更久。"),
        traceAhead: hidden(1.3),
        settleSpeed: hidden(0.7)
    });

    stages("axekick", [
        { level: 30, values: { chop: 136 } },
        { level: 50, values: { chop: 156 } }
    ]);

    defineDamage("axekick", "chop", {}, { contact: true });

    describe("axekick", [
        { key: "description.0", values: ["chop"] },
        { key: "description.1", values: ["hopHeight", "hopSpeed", "chopSpeed", "drift"] },
        { key: "description.2", values: ["reach", "hitRadius", "crash"] },
        { key: "description.3", values: ["dazeChance", "dazeTicks", "shove", "fumbleChance"] },
        { key: "high.on", values: [], when: function (context) { return read(context.detail.values, ["high"]) === true; } },
        { key: "high.off", values: [], when: function (context) { return read(context.detail.values, ["high"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop"] }
    ]);
}
