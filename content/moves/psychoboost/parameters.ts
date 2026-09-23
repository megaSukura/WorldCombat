/**
 * 精神突进 / psychoboost 的参数与伤害段。本族「力竭奥义」里威力最高、以**隔空内爆**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／特殊／威力 140／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 1 位（Deoxys）。
 *   描述「使出全部力量攻击对手。使用之后会因为反作用力，自己的特攻大幅降低」。
 *
 * 翻译：把「把全部力量一次隔空压出去」翻成即时战斗里**一次念力内爆**——几圈念力环从四面收拢，
 *   在目标身上猛地撞合、炸开；施法者的精神力随之一空，自身特攻掉 2 级，提交那一刻就付。
 *   回响式让这次内爆在片刻后于原地再响一次，总伤害更高，但目标有机会在回响前离开。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群；
 *   精神突进是唯一**看不见弹道、念力环隔空收拢后内爆**的那一记，基础威力也最高（140）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   focus       威力：特攻给强度、等级拾级；回响式把主爆压低一点。
 *   converge    收拢时间：速度决定念力环合拢多快。
 *   burstRadius 内爆半径：体型（高、宽）决定炸开多大。
 *   rings       念力环数：特攻与等级决定合拢几圈，也驱动画面。
 *   reach       射程：特攻给隔空触及的距离。
 *   echoShare   回响保留：特攻决定第二响留多少（回响式才有）。
 *   echoDelay   回响延迟：速度决定第二响多快（回响式才有）。
 *   echoRadius  回响范围：特攻决定第二响波及多开（回响式才有）。
 *   insightLoss 自身特攻下降级：原生固定 2 级。
 *   tempo/aftercast/recharge：速度定节奏，回响式更慢更长。
 *
 * 配置 `echo`（回响式，默认关）双向取舍：
 *   开＝主爆威力 ×0.86，但在 `echoDelay` 后于**原爆点**再内爆一次、对 `echoRadius` 内的敌人补上
 *   `echoShare` 的伤害，起手 +3 刻、冷却 +7 刻；目标若在回响前走出范围就躲掉第二响。
 *   关（瞬爆式）＝一下全力、瞬时结算、单点更重、更快。开是延迟的总量更高，关是即时的稳定爆发。
 *
 * 伤害段 `focus` 与参数同名，走共享换算（原始类别 Special）；对手特防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("psychoboost", {
        /** 威力：基础 138；特攻每比 60 多 1 加 1.0（夹 −30..62）；等级每比 20 高 1 加 0.3（夹 0..20）；
         *  回响 ×0.86 / 瞬爆 ×1.0；夹 96..232。 */
        focus: formula(
            F.base(138)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 62))
                .plus(F.level().minus(20).times(0.3).clamp(0, 20))
                .times(F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")), F.const(0.86), F.const(1.0)))
                .clamp(96, 232).round(1),
            "内爆威力", {
                unit: "威力",
                description: "念力环撞合那一下的力；特攻给的系数是全族最高的一档，等级越高越足。回响式把主爆压低一点，把力留一部分给第二响。对手特防、相性与暴击在命中时另算。"
            }),
        /** 收拢时间：基础 8 刻；速度每比 55 快 1 减 0.03（夹 −0.6..2）；夹 4..12。 */
        converge: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-0.6, 2)).clamp(4, 12).round(0),
            "收拢时间", "念力环从四面合到目标身上要多久；速度越快合得越急。目标读得出这几刻的预告。"),
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
        /** 回响保留：回响式 = 0.5 − 特攻偏移[−0.1,0.15] / 瞬爆式 = 0；夹 0..0.8。 */
        echoShare: percent(
            F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")),
                F.base(0.5).minus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.1, 0.15)), F.const(0))
                .clamp(0, 0.8).round(2),
            "回响保留", "第二响保留多少威力；特攻越高越均匀。只有回响式有。"),
        /** 回响延迟：回响式 = 20 − 速度偏移[−3,6] / 瞬爆式 = 0；夹 12..28。 */
        echoDelay: seconds(
            F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")),
                F.base(20).minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 6)).clamp(12, 28), F.const(0))
                .round(0),
            "回响延迟", "第一响之后隔多久在原爆点再响一次；速度快的个体响得更急。只有回响式有。"),
        /** 回响范围：回响式 = 2.0 + 特攻偏移[0,0.9] / 瞬爆式 = 0；夹 1.4..3.2。 */
        echoRadius: formula(
            F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")),
                F.base(2.0).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.9)), F.const(0))
                .clamp(0, 3.2).round(2),
            "回响范围", {
                unit: "格",
                description: "第二响在原爆点波及多大；特攻越高传得越开。画面里那圈回响环就是这个半径。只有回响式有。"
            }),
        /** 自身特攻下降级：原生固定 2 级；夹 2..6。 */
        insightLoss: formula(
            F.const(2).clamp(2, 6).round(0),
            "自身特攻下降", {
                unit: "级",
                description: "一次内爆后自身特攻下降的能力等级；原生固定 2 级，提交那一刻就付，中与不中都一样。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；回响 +3；夹 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")), F.const(3), F.const(0)))
                .clamp(8, 18).round(0),
            "起手", "把精神力压成一点的时间；速度越快越短，回响式要多留一份力气。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(7, 16).round(0),
            "收招", "炸完把散掉的精神收回来、重新站稳的时间；速度越快越短。"),
        /** 冷却：基础 42 刻；速度每比 55 快 1 减 0.07（夹 −3..6）；回响 +7；夹 28..56。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(55).times(0.07).clamp(-3, 6))
                .plus(F.when(F.pref("echo", text("worldcombat.skill.psychoboost.preference.echo")), F.const(7), F.const(0)))
                .clamp(28, 56).round(0),
            "冷却", "两次内爆之间等待多久；快的个体回气更快，回响式缓得更久。")
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
        { key: "echo.on", values: ["echoShare","echoDelay","echoRadius"], when: function (context) { return read(context.detail.values, ["echo"]) === true; } },
        { key: "echo.off", values: [], when: function (context) { return read(context.detail.values, ["echo"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.focus"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.focus", "tier.1.reach"] }
    ]);
}
