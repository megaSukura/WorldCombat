/**
 * 奇异之风 / ominouswind —— 参数与伤害段。
 *
 * 原生事实：Ghost／特殊／威力 60／命中 100／PP 5／目标单体／10% 概率让自身五项战斗能力各升 1 级。
 *
 * 翻译：把「突然刮起毛骨悚然的暴风」落成一道**从施法者脚下窜出、贴着地面追着目标跑、在目标脚下从四面
 * 收拢的幽风**。它不在路上伤人——一路只是聚势，到了目标脚下才突然炸开，把那一圈的东西朝中心收拢；
 * 风会跟着目标转向（轻追踪），所以光靠站住不动躲不掉，跑得比风快才能把它甩掉。
 * 原生的「五项战斗能力提升」是幽风回卷的结果：收拢后一缕冷气倒流回施法者身上，有概率把攻击、防御、特攻、
 * 特防、速度一起抬 1 级。
 *
 * 与同族分开（同为「命中后反哺出手者」的余波族）：原始之力以自身为心、原地向外轰开；银色旋风向前铺开一扇；
 *   彗星拳是贴身的重拳。奇异之风是唯一**先奔袭到目标点、再向内收拢**的那一道。
 * 与 twister 分开：龙卷风在原地立起、持续多拍切割并抬升；奇异之风只奔袭一次、一瞬间收拢、不留场。
 * 与 hurricane 分开：暴风是一堵横扫的宽风墙、沿途都打；奇异之风在途中不伤人。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   squall       风威：特攻定这一收的力度，等级定风的厚。
 *   travel       奔袭距离：特攻决定风能追多远（本招射程）。
 *   front        奔袭速度：特攻与速度共同决定每刻前进多少，也决定对手能有多久的走位窗口。
 *   coilRadius   收拢半径：碰撞箱高度与特攻共同决定炸开多大一圈（也是画面范围）。
 *   pull         内收距离：特攻决定把目标朝中心收多近。
 *   surgeChance  反哺概率：特攻与等级共同决定，基础 10% 取自原生。
 *   surgeStages  反哺级数：固定 1 级，与原生一致。
 *   wisps        幽丝数：特攻与等级决定收拢时卷起的幽丝数量，也驱动表现。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 haunt（缠魄式）双向取舍：开启＝收拢半径 ×0.8、威力 ×1.1、内收更强、反哺概率 +0.05，但奔袭更慢、
 *   冷却更长；关闭（漫游式，默认）＝奔袭更快更远、覆盖更宽，但单点更轻、内收更弱。
 *
 * 伤害段 squall：幽风收拢那一下随精灵数据变化的那部分。
 */

namespace PokemonSkills {
    actionParameters.define("ominouswind", {
        squall: formula(
            F.base(60)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-14, 30))
                .plus(F.level().minus(28).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("haunt"), F.const(1.1), F.const(0.95)))
                .clamp(48, 132).round(1),
            "风威", {
                unit: "威力",
                description: "幽风收拢那一下的基础威力；特攻越高风越狠，等级越高风越厚。缠魄式把风收得更紧，因此更重。对手特防、相性与暴击在命中时另算。"
            }),
        travel: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 5)).clamp(9, 16).round(1),
            "奔袭距离", {
                unit: "格",
                description: "幽风从施法者出发能追多远；特攻越高追得越远。它也是本招的实际射程来源。"
            }),
        front: formula(
            F.base(0.72)
                .plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.05, 0.12))
                .plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.05, 0.12))
                .times(F.when(F.pref("haunt"), F.const(0.8), F.const(1.15)))
                .clamp(0.4, 1.1).round(2),
            "奔袭速度", {
                unit: "格/刻",
                description: "幽风每刻向前窜多少；特攻与速度越高越急，对手能走位躲开的时间就越短。缠魄式慢慢压过去，漫游式一掠而过。"
            }),
        coilRadius: formula(
            F.base(2.0)
                .plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.3, 0.5))
                .times(F.when(F.pref("haunt"), F.const(0.82), F.const(1.15)))
                .clamp(1.5, 3.4).round(2),
            "收拢半径", {
                unit: "格",
                description: "幽风在目标脚下炸开、向内收拢的半径；个子高、特攻高的个体收得更开，缠魄式收得更小。"
            }),
        pull: formula(
            F.base(0.9)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.2, 0.6))
                .times(F.when(F.pref("haunt"), F.const(1.15), F.const(0.9)))
                .clamp(0.4, 2.0).round(2),
            "内收距离", {
                unit: "格",
                description: "被幽风罩住的目标朝中心被收拢多远；特攻越高收得越紧，缠魄式收得更狠，把目标从掩体或队友身边拽过来。"
            }),
        surgeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.12))
                .plus(F.level().minus(28).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("haunt"), F.const(0.05), F.const(0)))
                .clamp(0.06, 0.35).round(3),
            "反哺概率", "幽风回卷、把施法者五项战斗能力各抬 1 级的概率；原生 10% 起，特攻与等级越高越容易抓住，缠魄式更稳。"),
        surgeTicks: seconds(F.base(140), "反哺持续", "本招的五项能力强化持续时间；再次触发刷新时间，保持一层。"),
        surgeStages: formula(
            F.base(1),
            "反哺级数", {
                unit: "级",
                description: "一次反哺让自身五项战斗能力各提升的能力等级。"
            }),
        wisps: formula(
            F.base(20)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 10))
                .plus(F.level().minus(28).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("haunt"), F.const(1.15), F.const(1)))
                .clamp(16, 60).round(0),
            "幽丝数", {
                unit: "缕",
                description: "幽风收拢时卷起的幽丝数量，也驱动表现密度；特攻与等级越高越密，缠魄式更多。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("haunt"), F.const(2), F.const(0))).clamp(7, 17).round(0),
            "起手", "把风攥在手里、放出去前的蓄势时间；速度越快越短，缠魄式多蓄一会儿。"),
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4)).clamp(6, 15).round(0),
            "收招", "幽风散尽后的收势；速度越快越短。"),
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("haunt"), F.const(6), F.const(0))).clamp(22, 54).round(0),
            "冷却", "两次放风之间的等待；速度越快回得越快，缠魄式缓得更久。")
    });

    defineDamage("ominouswind", "squall", {});

    stages("ominouswind", [
        { level: 38, values: { squall: 74, travel: 13 } }
    ]);

    describe("ominouswind", [
        { key: "description.0", values: ["squall", "travel"] },
        { key: "description.1", values: ["front", "coilRadius", "pull"] },
        { key: "description.2", values: ["surgeChance", "surgeStages", "surgeTicks"] },
        { key: "description.3", values: ["pref.haunt"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.squall", "tier.0.travel"] }
    ]);
}
