/**
 * 精神突进 / psychoboost 的参数与伤害段。本族「力竭奥义」里威力最高、以**隔空内爆**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／特殊／威力 140／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 1 位（Deoxys）。
 *   描述「使出全部力量攻击对手。使用之后会因为反作用力，自己的特攻大幅降低」。
 *
 * 翻译：把「把全部力量一次隔空压出去」翻成即时战斗里**一次念力内爆**——几圈念力环从四面收拢，
 *   在锁定的那一点上猛地撞合、炸开；合拢期间术者要保持通视原点，若视线被遮断，念环就在遮挡前散开、不在远端爆。
 *   施法者的精神力随之一空，自身特攻掉 2 级，提交那一刻就付。凝聚式把环收得更久、压得更实，单次更重，
 *   但总预算并不比原来更高，只是把力气集中到唯一一响上。
 *
 * 与同族分开：飞叶风暴是旋转前进并沿路旋切的叶刃、过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群；
 *   精神突进是唯一**看不见弹道、念力环隔空收拢后一次内爆**的那一记，基础威力也最高（140）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   focus       威力：特攻给强度、等级拾级；凝聚式把单次压得更高。
 *   converge    收拢时间：速度决定念力环合拢多快；凝聚式收得更久。
 *   burstRadius 内爆半径：体型（高、宽）决定炸开多大。
 *   rings       念力环数：特攻与等级决定合拢几圈，也驱动画面。
 *   reach       射程：特攻给隔空触及的距离。
 *   insightLoss 自身特攻下降级：原生固定 2 级。
 *   tempo/aftercast/recharge：速度定节奏，凝聚式更慢更长。
 *
 * 配置 `hold`（凝聚式，默认关）双向取舍：
 *   开＝收拢时间 ×1.5、单次威力 ×1.15，把全部力气压进唯一一响；起手 +3 刻、冷却 +7 刻，给你更长的一整个破绽窗口。
 *   关（瞬爆式）＝合拢更快、出手更省，单次略低。开是抓准时机的重锤，关是快速稳定的压制，各有适用局面。
 *
 * 伤害段 `focus` 与参数同名，走共享换算（原始类别 Special）；对手特防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("psychoboost", {
        /** 威力：基础 138；特攻每比 60 多 1 加 1.0（夹 −30..62）；等级每比 20 高 1 加 0.3（夹 0..20）；
         *  凝聚 ×1.15 / 瞬爆 ×1.0；夹 96..252。 */
        focus: formula(
            F.base(138)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 62))
                .plus(F.level().minus(20).times(0.3).clamp(0, 20))
                .times(F.when(F.pref("hold", text("worldcombat.skill.psychoboost.preference.hold")), F.const(1.15), F.const(1.0)))
                .clamp(96, 252).round(1),
            "内爆威力", {
                unit: "威力",
                description: "念力环撞合那一下的力；特攻给的系数是全族最高的一档，等级越高越足。凝聚式把力气集中到唯一一响上，单次更高，但总预算并不比原来更高。对手特防、相性与暴击在命中时另算。"
            }),
        /** 收拢时间：基础 8 刻；速度每比 55 快 1 减 0.03（夹 −0.6..2）；凝聚 ×1.5；夹 4..18。 */
        converge: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-0.6, 2))
                .times(F.when(F.pref("hold", text("worldcombat.skill.psychoboost.preference.hold")), F.const(1.5), F.const(1.0)))
                .clamp(4, 18).round(0),
            "收拢时间", "念力环从四面合到锁定那一点要多久；速度越快合得越急，凝聚式要多压一阵。目标读得出这几刻的预告，遮断视线就能避开内爆。"),
        /** 内爆半径：基础 0.6 格；高每比 1.4 高 1 格加 0.1（夹 −0.05..0.3）；宽每比 0.9 宽 1 格加 0.3（夹 −0.05..0.3）；夹 0.45..1.2。 */
        burstRadius: formula(
            F.base(0.6)
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3))
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.05, 0.3))
                .clamp(0.45, 1.2).round(2),
            "内爆半径", {
                unit: "格",
                description: "内爆在目标身上炸开的范围；体型越大炸得越开。画面里合拢的环与爆开的球就是这个尺度。"
            }),
        /** 念力环数：基础 3；特攻每比 60 多 1 加 0.02（夹 0..2）；等级每比 20 高 1 加 0.02（夹 0..1.2）；夹 3..7。 */
        rings: formula(
            F.base(3)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2))
                .plus(F.level().minus(20).times(0.02).clamp(0, 1.2))
                .clamp(3, 7).round(0),
            "念力环数", {
                unit: "环",
                description: "合拢到目标身上的念力环数；特攻与等级越高环越多。画面里的环数与合拢密度按它派生。"
            }),
        /** 射程：基础 12 格；特攻每比 60 多 1 加 0.05（夹 −2..3.5）；夹 9..16。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 3.5)).clamp(9, 16).round(1),
            "射程", {
                unit: "格",
                description: "念力能隔空触及多远；特攻高够得远。它也是本招的实际射程，但没有弹道，看不见东西飞过去。"
            }),
        /** 自身特攻下降级：原生固定 2 级；夹 2..6。 */
        insightLoss: formula(
            F.const(2).clamp(2, 6).round(0),
            "自身特攻下降", {
                unit: "级",
                description: "一次内爆后自身特攻下降的能力等级；原生固定 2 级，提交那一刻就付，中与不中都一样。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；凝聚 +3；夹 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.psychoboost.preference.hold")), F.const(3), F.const(0)))
                .clamp(8, 18).round(0),
            "起手", "把精神力压成一点的时间；速度越快越短，凝聚式要多压一阵。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(7, 16).round(0),
            "收招", "炸完把散掉的精神收回来、重新站稳的时间；速度越快越短。"),
        /** 冷却：基础 42 刻；速度每比 55 快 1 减 0.07（夹 −3..6）；凝聚 +7；夹 28..56。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(55).times(0.07).clamp(-3, 6))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.psychoboost.preference.hold")), F.const(7), F.const(0)))
                .clamp(28, 56).round(0),
            "冷却", "两次内爆之间等待多久；快的个体回气更快，凝聚式缓得更久。")
    });

    stages("psychoboost", [
        { level: 30, values: { focus: 148, rings: 4 } },
        { level: 50, values: { focus: 166, reach: 14 } }
    ]);

    defineDamage("psychoboost", "focus", {});

    describe("psychoboost", [
        { key: "description.0", values: ["focus"] },
        { key: "description.1", values: ["converge","burstRadius"] },
        { key: "description.2", values: ["reach"] },
        { key: "description.3", values: ["insightLoss"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.focus"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.focus", "tier.1.reach"] }
    ]);
}
