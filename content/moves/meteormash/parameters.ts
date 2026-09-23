/**
 * 彗星拳 / meteormash —— 参数与伤害段。
 *
 * 原生事实：Steel／物理／威力 90／命中 90／PP 10／flags 带 punch、contact／目标单体／
 *   20% 概率让自身攻击上升 1 级。
 *
 * 翻译：把「使出彗星般的拳头攻击对手」落成一记**贴身冲进、由上而下砸实的流星重拳**——施法者先冲进拳程，
 * 一拳砸在目标或落点上，拳锋炸开一圈碎石与火星，落点地面被砸出一小片焦黑的坑；被正面砸中的吃 `impact`，
 * 落点周围的敌人吃 `shock` 并被震开。原生的「攻击上升」是重拳反震的结果：砸实后机身发热，有概率把物攻抬 1 级。
 *
 * 与同族分开（同是「命中后反哺出手者」的余波族）：原始之力以自身为心向外轰、奇异之风奔袭后收拢、
 *   银色旋风向前铺一扇。彗星拳是唯一**冲进去、从上方砸下、在地面留坑**的那一记，也是族里唯一的物理拳。
 * 与 ironhead 分开：铁头是短步推撞、把目标轰开、不砸地；彗星拳要冲得更远、拳落在地上、留下焦坑，反哺的是攻击。
 * 与 heavyslam 分开：重磅冲撞按双方分量比求值、从空中落下砸自己；彗星拳是平冲到位后一拳砸下，拳是主体。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   impact       拳威：攻击定这一拳的力度，等级定拳的厚。
 *   shock        震威：落点周围被震开那一下，攻击与等级另算一条曲线。
 *   reach        冲刺距离：速度决定能冲多远（本招射程）。
 *   fist         拳径：碰撞箱宽度决定拳锋多粗，也决定正面命中判定多宽。
 *   crashRadius  落点半径：攻击与体型决定震开多大一圈。
 *   shove        震开距离：攻击决定把圈内目标推多远。
 *   craterRadius 焦坑半径：攻击决定把地面砸出多大一片焦黑。
 *   craterTicks  焦坑停留：等级决定焦坑留多久，到期原方块回来。
 *   flare        火星数：攻击与等级决定迸出的火星量，也驱动表现。
 *   surgeChance  反哺概率：攻击与等级共同决定，基础 20% 取自原生。
 *   surgeStages  反哺级数：固定 1 级，与原生一致。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 comet（陨星式）双向取舍：开启＝冲刺更远、落点更大、焦坑更大、震威 ×1.3，但拳威 ×0.9、冷却 +6 刻；
 *   关闭（重拳式，默认）＝拳更重、出手更利落，适合点名单体重击。
 *
 * 伤害段 impact（正面砸中）与 shock（落点震开）：各自随精灵数据变化的那部分。
 */

namespace PokemonSkills {
    actionParameters.define("meteormash", {
        impact: formula(
            F.base(90)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-18, 40))
                .plus(F.level().minus(28).times(0.8).clamp(0, 22))
                .times(F.when(F.pref("comet"), F.const(0.9), F.const(1.12)))
                .clamp(70, 190).round(1),
            "拳威", {
                unit: "威力",
                description: "流星拳正面砸中的基础威力；攻击越高拳越狠，等级越高拳越沉。陨星式把力量摊给更大的落点，拳本身略轻。对手防御、相性与暴击在命中时另算。"
            }),
        shock: formula(
            F.base(48)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-10, 22))
                .plus(F.level().minus(28).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("comet"), F.const(1.3), F.const(1)))
                .clamp(36, 110).round(1),
            "震威", {
                unit: "威力",
                description: "落点周围的敌人被震开那一下的基础威力；攻击越高震得越狠，陨星式把震面铺得更开。"
            }),
        reach: formula(
            F.base(4.5).plus(F.stat("speed").minus(60).times(0.03).clamp(-0.8, 1.6))
                .times(F.when(F.pref("comet"), F.const(1.3), F.const(1)))
                .clamp(3.5, 7).round(1),
            "冲刺距离", {
                unit: "格",
                description: "施法者冲进拳程的距离，也是本招的实际射程来源；速度越快冲得越远，陨星式冲得更长。"
            }),
        fist: formula(
            F.base(0.6).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.15, 0.5)).clamp(0.45, 1.2).round(2),
            "拳径", {
                unit: "格",
                description: "拳锋的粗细，决定正面命中判定多宽；体型宽的个体拳面更大。"
            }),
        crashRadius: formula(
            F.base(1.6)
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.3, 0.8))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.2, 0.4))
                .times(F.when(F.pref("comet"), F.const(1.35), F.const(1)))
                .clamp(1.2, 3.0).round(2),
            "落点半径", {
                unit: "格",
                description: "拳砸下时震开的半径，也是本招可被读出的范围；体型宽、攻击高的更大，陨星式铺得更开。"
            }),
        shove: formula(
            F.base(0.8).plus(F.stat("attack").minus(60).times(0.01).clamp(-0.2, 0.6)).clamp(0.4, 2.2).round(2),
            "震开距离", {
                unit: "格",
                description: "落点圈内除正面目标外的敌人被震开多远；攻击越高推得越远。"
            }),
        craterRadius: formula(
            F.base(1.4).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.3, 0.5))
                .times(F.when(F.pref("comet"), F.const(1.3), F.const(1)))
                .clamp(1.0, 2.6).round(2),
            "焦坑半径", {
                unit: "格",
                description: "落点地面被砸成焦黑的半径；攻击越高砸得越开，陨星式留下更大的坑，到期原方块回来。"
            }),
        craterTicks: seconds(
            F.base(120).plus(F.level().minus(28).times(1.5).clamp(0, 60)).clamp(80, 260).round(0),
            "焦坑停留", "落点那片焦黑停留多久；等级越高留得越久，到期原方块回来。"),
        flare: formula(
            F.base(22)
                .plus(F.stat("attack").minus(60).times(0.25).clamp(-6, 12))
                .plus(F.level().minus(28).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("comet"), F.const(1.2), F.const(1)))
                .clamp(18, 64).round(0),
            "火星数", {
                unit: "点",
                description: "拳砸实时迸出的火星数量，也驱动表现密度；攻击与等级越高越密，陨星式更多。"
            }),
        surgeChance: percent(
            F.base(0.20)
                .plus(F.stat("attack").minus(60).times(0.0018).clamp(-0.06, 0.14))
                .plus(F.level().minus(28).times(0.0012).clamp(0, 0.06))
                .clamp(0.12, 0.45).round(3),
            "反哺概率", "拳砸实的反震让自身攻击上升 1 级的概率；原生 20% 起，攻击与等级越高越容易抓住。"),
        surgeStages: formula(
            F.base(1),
            "反哺级数", {
                unit: "级",
                description: "一次反哺让自身攻击提升的能力等级。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "沉肩压腿、拳上聚起流星火花的蓄势时间；速度越快越短。"),
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(6, 14).round(0),
            "收招", "拳势收住后的收招；速度越快越短。"),
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("comet"), F.const(6), F.const(0))).clamp(20, 52).round(0),
            "冷却", "两次重拳之间的等待；速度越快回得越快，陨星式缓得更久。")
    });

    defineDamage("meteormash", "impact", {}, { punch: true, contact: true });
    defineDamage("meteormash", "shock", {}, {});

    stages("meteormash", [
        { level: 45, values: { impact: 118, shock: 62 } }
    ]);

    describe("meteormash", [
        { key: "description.0", values: ["impact", "reach"] },
        { key: "description.1", values: ["shock", "crashRadius", "shove"] },
        { key: "description.2", values: ["surgeChance", "surgeStages"] },
        { key: "description.3", values: ["craterRadius", "craterTicks", "pref.comet"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.impact", "tier.0.shock"] }
    ]);
}
