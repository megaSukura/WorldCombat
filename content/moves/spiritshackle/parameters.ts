/**
 * 缝影 / spiritshackle 的参数与伤害段。
 *
 * 原生事实：Ghost／物理／威力 80／命中 100／PP 10／单目标／不接触；附加 100% 让目标 trapped（无法逃走）。
 * 1 位学习者（狙射树枭，Cobblemon 1.8）。原生描述「攻击的同时，缝住对手的影子，使其无法逃走」。
 *
 * 翻译：把「同时缝住影子」落成一箭**把目标的影子钉在地上**——一支暗影箭射中目标后，它脚下的影子被几道缝线
 * 钉在地面一点上，目标再也走不出去。钉住由本单元的 `world_combat:spiritshackle_pinned` 状态承担：共享身份
 * `world_combat:status/trapped`，移动归零 + 导航速度归零；影子缝线是持久效果画的，跟着目标动。
 * 反制：被外力（击退、队友拉拽、传送）带离锚点超过 `escape` 格，缝线绷断、钉住解除；或者等时长走完。
 *
 * 与同族分开：同为「不让走」，捕兽夹是提前埋点等人踩、施法者不陪；缝影是一箭钉在**当前目标**脚下的影子里，
 * 施法者射完就走，是唯一的中远距离狙击式定身。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   pierce       穿影威力：物攻定箭的劲，等级定暗影的厚。
 *   reach        射击距离：物攻与等级决定箭能送多远，也是本招的实际射程。
 *   arrowSpeed   箭速：速度决定箭飞得多快，目标更难在半空走开。
 *   pinTicks     缝住时长：物攻与等级决定影子被钉多久。
 *   escape       绷断距离：碰撞箱宽度定锚点松紧，体型大的目标要拉更远才绷断。
 *   threads      缝线数量：物攻换算，驱动画面里影线的密度。
 *   shadowRadius 影池半径：身高定脚下那片影子画多大。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `anchor`（深缝）双向取舍（默认关）：
 *   开（深缝）：威力 ×1.15、缝住时长 ×1.4、绷断距离 +0.5，代价是起手 +4 刻、冷却 +8 刻、射击距离 −1 格——钉得久但更慢更近。
 *   关（快缝）：出手更快、射得更远，代价是缝住更短、更容易被扯开。
 *   两向各有局面：深缝用来锁住逃跑的厚目标；快缝用来在中远距离快速打断一次走位。
 *
 * 伤害段 `pierce` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("spiritshackle", {
        /** 穿影威力：76 + 物攻偏移[−10,32] + 等级(≥30)偏移[0,14]；深缝 ×1.15 / 快缝 ×0.9；夹 40..130。 */
        pierce: formula(
            F.base(76)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-10, 32))
                .plus(F.level().minus(30).times(0.3).clamp(0, 14))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(1.15), F.const(0.9)))
                .clamp(40, 130).round(1),
            "穿影威力", {
                base: 76, unit: "威力",
                description: "这一箭穿影的基础威力；物攻越高箭越劲，等级越高暗影越厚。对手防御、相性与暴击在命中时另算。"
            }),
        /** 射击距离：12 + 物攻偏移[−1.5,3] + 等级(≥30)偏移[0,2.5] − 深缝 1；夹 9..20。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("attack").minus(60).times(0.03).clamp(-1.5, 3))
                .plus(F.level().minus(30).times(0.08).clamp(0, 2.5))
                .minus(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(1), F.const(0)))
                .clamp(9, 20).round(2),
            "射击距离", {
                base: 12, unit: "格",
                description: "箭能送多远；物攻与等级越高射得越远，深缝式为站稳锚点多收一点。它也是本招的实际射程。"
            }),
        /** 箭速：1.5 + 速度偏移[−0.2,0.5]；夹 1.2..2.2。 */
        arrowSpeed: formula(
            F.base(1.5).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.5)).clamp(1.2, 2.2).round(2),
            "箭速", {
                base: 1.5, unit: "格/刻",
                description: "暗影箭离弦的速度；速度快的个体射得更急，目标更难在半空走开。"
            }),
        /** 缝住时长：100 + 物攻偏移[0,50] + 等级(≥30)偏移[0,40]；深缝 ×1.4；夹 70..220。 */
        pinTicks: seconds(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.4).clamp(0, 50))
                .plus(F.level().minus(30).times(0.8).clamp(0, 40))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(1.4), F.const(1.0)))
                .clamp(70, 220).round(0),
            "缝住时长", "影子被钉在地面的时长；物攻与等级越高钉得越久，深缝式再拉长。到期缝线松开。"),
        /** 绷断距离：2.0 + 宽度偏移[−0.15,0.6] + 深缝 0.5；夹 1.8..3.2。 */
        escape: formula(
            F.base(2.0)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.15, 0.6))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(0.5), F.const(0)))
                .clamp(1.8, 3.2).round(2),
            "绷断距离", {
                base: 2.0, unit: "格",
                description: "被外力带离锚点超过这个距离，缝线就绷断、钉住解除；体型越宽锚点越松，深缝式更结实。"
            }),
        /** 缝线数量：10 + 物攻 ×0.15；夹 8..30。 */
        threads: formula(
            F.base(10).plus(F.stat("attack").times(0.15)).clamp(8, 30).round(0),
            "缝线数量", {
                base: 10, unit: "道",
                description: "钉住影子的缝线道数；随物攻增长，也决定画面里影线的密度。"
            }),
        /** 影池半径：0.9 + 宽度偏移[−0.1,0.5]；夹 0.8..1.6。 */
        shadowRadius: formula(
            F.base(0.9).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.5)).clamp(0.8, 1.6).round(2),
            "影池半径", {
                base: 0.9, unit: "格",
                description: "目标脚下那片影池画多大；体型越宽影池越广，也是表现里地面圈的半径。"
            }),
        /** 起手：12 − 速度偏移[−3,4] + 深缝 4；夹 7..20。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(4), F.const(0)))
                .clamp(7, 20).round(0),
            "起手", "张弓抽影、把暗影聚成箭的时间；速度越快越短，深缝式要多蓄一点。"),
        /** 收招：9 − 速度偏移[−2,3]；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(5, 14).round(0),
            "收招", "射完收弓的时间；速度快的个体更短。"),
        /** 冷却：36 − 速度偏移[−5,7] + 深缝 8；夹 20..50。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(60).times(0.06).clamp(-5, 7))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.spiritshackle.preference.anchor")), F.const(8), F.const(0)))
                .clamp(20, 50).round(0),
            "冷却", "再次张弓前的等待；深缝式更长，快缝更短。")
    });

    defineDamage("spiritshackle", "pierce", {}, { contact: false });

    stages("spiritshackle", [
        { level: 45, values: { pierce: 92, pinTicks: 130 } }
    ]);

    describe("spiritshackle", [
        { key: "description.0", values: ["pierce"] },
        { key: "description.1", values: ["reach", "arrowSpeed"] },
        { key: "description.2", values: ["pinTicks", "escape"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["anchor"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["anchor"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pierce", "tier.0.pinTicks"] }
    ]);
}
