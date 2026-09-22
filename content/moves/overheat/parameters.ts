/**
 * 过热 / overheat 的参数与伤害段。本族「力竭奥义」里以**身前扇形热浪**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fire／特殊／威力 130／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 96 位。
 *   描述「使出全部力量攻击对手。使用之后会因为反作用力，自己的特攻大幅降低」。
 *
 * 翻译：把「一次把全部力量排出去」翻成即时战斗里**一次排空全身热量**——热浪在身前铺开一张扇形，
 *   沿准线扫过去，站在扇面里的人一起挨烧，落点地上留下一片焦痕。反作用力就是特攻掉 2 级，提交那一刻就付：
 *   热量排空的同时精神力也被抽走。过载式压得更满，威力更高，但自身特攻掉 3 级。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   过热是唯一**身前一张同时罩住几人的扇形热浪**，也是唯一在过载式下比原生多掉一级特攻的那记。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   heat        威力：特攻给温、体重给热容、等级拾级；过载式更足。
 *   cone        扇面张角：体型（宽）决定热浪铺多开。
 *   gust        热浪推进速度：速度决定风口多快。
 *   reach       射程：特攻给送出的距离、速度给起步。
 *   share       扇内次要目标保留：特攻决定烧得均匀与否。
 *   scorch      灼痕半径：特攻决定烧得多开。
 *   scorchTicks 灼痕时长：等级与特攻决定焦地留多久。
 *   burnChance  点燃概率：特攻与等级决定。
 *   embers      火星数：特攻派生，驱动画面里的火星与火团。
 *   insightLoss 自身特攻下降级：原生 2 级，过载式 3 级。
 *   tempo/aftercast/recharge：速度定节奏，过载式更慢更长。
 *
 * 配置 `vent`（过载式，默认关）双向取舍：
 *   开＝威力 ×1.25，但自身特攻多掉一级（共 3 级）、起手 +2 刻、冷却 +4 刻；关（收束式）＝威力 ×1.0、
 *   只掉原生 2 级、出手更快。开是多烧一记的爆发，关是能连着用的持续输出，各有适用局面。
 *
 * 伤害段 `heat` 与参数同名，走共享换算（原始类别 Special）；对手特防、相性与暴击在命中时另算；
 * 点燃走 `hurt(..., { status: "burn", chance })` 的共享次要状态路线，宝可梦同步为原生灼伤。
 */
namespace PokemonSkills {
    actionParameters.define("overheat", {
        /** 威力：基础 124；特攻每比 60 多 1 加 0.95（夹 −28..58）；体重每 10kg 比 60kg 重 1kg 加 0.25（夹 −10..24）；
         *  等级每比 20 高 1 加 0.3（夹 0..18）；过载 ×1.25；夹 84..240。 */
        heat: formula(
            F.base(124)
                .plus(F.stat("specialAttack").minus(60).times(0.95).clamp(-28, 58))
                .plus(F.body("weight").div(10).minus(60).times(0.25).clamp(-10, 24))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("vent", text("worldcombat.skill.overheat.preference.vent")), F.const(1.25), F.const(1.0)))
                .clamp(84, 240).round(1),
            "热浪威力", {
                unit: "威力",
                description: "排空全身热量那一下的力；特攻越高越烫、体重越大蓄的热越多、等级越高越足。过载式把全部热量压进去，单发更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 扇面张角：基础 44°；宽每比 0.9 宽 1 格加 30（夹 −8..18）；夹 28..64。 */
        cone: formula(
            F.base(44).plus(F.body("width").minus(0.9).times(30).clamp(-8, 18)).clamp(28, 64).round(0),
            "扇面张角", {
                unit: "度",
                description: "热浪在身前铺开多宽；体型越宽的个体风口越开。画面里那张扇面就是这个角度。"
            }),
        /** 推进速度：基础 1.25 格/刻；速度每比 55 快 1 加 0.008（夹 −0.2..0.5）；夹 0.9..1.9。 */
        gust: formula(
            F.base(1.25).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5)).clamp(0.9, 1.9).round(2),
            "热浪速度", {
                unit: "格/刻",
                description: "热浪从身前推出去的速度；速度快的个体风口更快，目标更来不及走出扇面。"
            }),
        /** 射程：基础 8 格；特攻每比 60 多 1 加 0.03（夹 −1..2.5）；速度每比 55 快 1 加 0.03（夹 −1..2）；夹 6..12。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 2.5))
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .clamp(6, 12).round(2),
            "射程", {
                unit: "格",
                description: "扇面能推出多远；特攻高推得远、速度快的起步早。它也是本招的实际射程与指示扇面的半径。"
            }),
        /** 扇内保留：基础 0.5；特攻每比 60 多 1 减 0.002（夹 −0.15..0.2）；夹 0.25..0.75。 */
        share: percent(
            F.base(0.5).minus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.15, 0.2)).clamp(0.25, 0.75).round(2),
            "扇内保留", "同被扇面烧到的其他目标保留多少威力；特攻越高烧得越均匀。"),
        /** 灼痕半径：基础 1.1 格；特攻每比 60 多 1 加 0.006（夹 0..0.7）；夹 0.8..2.2。 */
        scorch: formula(
            F.base(1.1).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.7)).clamp(0.8, 2.2).round(2),
            "灼痕半径", {
                unit: "格",
                description: "热浪在落点烧焦的地面有多大；特攻越高烧得越开。画面里那块焦地就是这个半径。"
            }),
        /** 灼痕时长：基础 90 刻；等级每比 20 高 1 加 0.8（夹 0..50）；夹 70..180。 */
        scorchTicks: seconds(
            F.base(90).plus(F.level().minus(20).times(0.8).clamp(0, 50)).clamp(70, 180).round(0),
            "灼痕时长", "落点焦地留多久；等级越高留得越久。到时原方块回来。"),
        /** 点燃概率：基础 10%；特攻每比 60 多 1 加 0.0015（夹 −0.04..0.10）；夹 5%..25%。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.04, 0.10)).clamp(0.05, 0.25).round(3),
            "点燃概率", "被热浪扫到后被点着的概率；特攻越高越容易烧起来。点燃走共享灼伤。"),
        /** 火星数：基础 22；特攻每比 60 多 1 加 0.18；夹 14..50。 */
        embers: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.18)).clamp(14, 50).round(0),
            "火星数", {
                unit: "点",
                description: "热浪里翻卷的火星数量，也驱动画面里火团与火星的密度；特攻越高越密。"
            }),
        /** 自身特攻下降级：基础 2 级；过载 +1；夹 2..3。 */
        insightLoss: formula(
            F.const(2).plus(F.when(F.pref("vent", text("worldcombat.skill.overheat.preference.vent")), F.const(1), F.const(0)))
                .clamp(2, 3).round(0),
            "自身特攻下降", {
                unit: "级",
                description: "热量排空后自身特攻下降的能力等级；原生 2 级，过载式多掉一级。提交那一刻就付，中与不中都一样。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；过载 +2；夹 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("vent", text("worldcombat.skill.overheat.preference.vent")), F.const(2), F.const(0)))
                .clamp(8, 18).round(0),
            "起手", "把热量从全身逼到身前的时间；速度越快越短，过载式要多压一下。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(7, 16).round(0),
            "收招", "喷完把散掉的热气收掉、重新聚力的时间；速度越快越短。"),
        /** 冷却：基础 36 刻；速度每比 55 快 1 减 0.07（夹 −3..6）；过载 +4；夹 24..52。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(55).times(0.07).clamp(-3, 6))
                .plus(F.when(F.pref("vent", text("worldcombat.skill.overheat.preference.vent")), F.const(4), F.const(0)))
                .clamp(24, 52).round(0),
            "冷却", "两次排热之间等待多久；快的个体回气更快，过载式缓得更久。")
    });

    stages("overheat", [
        { level: 30, values: { heat: 134, embers: 28 } },
        { level: 50, values: { heat: 152, reach: 10 } }
    ]);

    defineDamage("overheat", "heat", {});

    describe("overheat", [
        { key: "description.0", values: ["heat"] },
        { key: "description.1", values: ["cone", "reach", "gust", "share"] },
        { key: "description.2", values: ["burnChance", "scorch", "scorchTicks"] },
        { key: "description.3", values: ["insightLoss"] },
        { key: "vent.on", values: [], when: function (context) { return read(context.detail.values, ["vent"]) === true; } },
        { key: "vent.off", values: [], when: function (context) { return read(context.detail.values, ["vent"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.heat", "tier.0.embers"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.heat", "tier.1.reach"] }
    ]);
}
