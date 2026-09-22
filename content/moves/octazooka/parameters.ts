/**
 * 章鱼桶炮 / octazooka 的参数与伤害段。
 *
 * 原生事实：Water、特殊、威力 65、命中 85、PP 10、bullet、目标单体，50% 概率降低 1 级命中（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「向对手的脸喷出墨汁」翻成一股连续喷出的墨流——分几股墨弹先后射出，各自带墨滴，
 * 打中目标时溅开、糊住视野，约一半机会削掉命中；喷溅的墨落在地上留一小片黑渍，过一会儿自己消失。
 * 它和泥巴炸弹同为直线弹，但墨流是多发连喷、颜色漆黑、命中后地上留墨渍。
 *
 * 数值来源（每项读不同的个体数据）：
 *   jet       每股墨弹的威力，特攻为主、等级为辅；浓墨每股 ×1.5、稀墨 ×0.85。
 *   shots     股数由速度决定（喷得越快分股越多），浓墨少一股（夹 2..5）。
 *   velocity  速度决定每股墨弹的飞行速度。
 *   radius    体型高度决定墨弹判定。
 *   reach     特攻决定喷多远。
 *   blind     特攻每满 110 加一级命中下降。
 *   chance    原生 50% 的致盲概率；浓墨再 +10%。
 *   interval  速度决定股与股之间的间隔，浓墨更慢。
 *   spread    速度决定喷射散布（越快越稳）。
 *   drops     特攻与等级决定墨滴数，同时驱动表现。
 *   stainTicks 特攻、等级与浓墨决定地面墨渍留多久。
 *   tempo     速度决定起手，浓墨多花一点时间。
 * 配置 thick（浓墨）双向取舍：每股更重、致盲概率更高、墨渍更久，但少一股、喷得更慢、起手与冷却更长。
 */
namespace PokemonSkills {
    actionParameters.define("octazooka", {
        jet: formula(
            F.base(18).plus(F.stat("specialAttack").minus(50).times(0.16).clamp(-4, 16))
                .plus(F.level().minus(25).times(0.25).clamp(0, 9))
                .times(F.when(F.pref("thick"), F.const(1.5), F.const(0.85)))
                .clamp(9, 40).round(1),
            "墨弹威力", {
                unit: "威力",
                description: "每一股墨弹落在目标身上的基础威力；特攻与等级越高越重，浓墨每股更足、稀墨更轻。对手防御、相性与暴击在命中时另算。"
            }),
        shots: formula(
            F.base(3).plus(F.stat("speed").minus(50).times(0.012).clamp(-0.4, 1.4))
                .minus(F.when(F.pref("thick"), F.const(1), F.const(0)))
                .clamp(2, 5).round(),
            "墨弹股数", {
                unit: "股",
                description: "一次喷出几股墨弹；速度越快分股越多，浓墨少一股。"
            }),
        velocity: formula(
            F.base(1.35).plus(F.stat("speed").minus(50).times(0.005).clamp(-0.2, 0.4)).clamp(1.05, 1.8).round(2),
            "墨弹速度", {
                unit: "格/刻",
                description: "每股墨弹的飞行速度；速度快的个体喷得更急。"
            }),
        radius: formula(
            F.base(0.22).plus(F.body("height").times(0.05)).clamp(0.22, 0.4).round(2),
            "墨弹半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高墨弹越大，整股墨流也更容易糊到脸上。"
            }),
        reach: formula(
            F.base(9).plus(F.stat("specialAttack").minus(50).times(0.05)).clamp(9, 17).round(1),
            "喷射距离", {
                unit: "格",
                description: "墨流能喷到多远；特攻高的个体喷得更远。"
            }),
        blind: formula(
            F.stat("specialAttack").div(110).floor().plus(1).clamp(1, 2),
            "命中下降", {
                unit: "级",
                description: "致盲成功时削掉的命中能力等级；特攻每满 110 多加一级。"
            }),
        chance: percent(
            F.base(0.5).plus(F.when(F.pref("thick"), F.const(0.1), F.const(0))).clamp(0.2, 0.8),
            "致盲概率", "墨汁糊住眼睛的概率；浓墨更高，整次施放最多结算一次。"),
        interval: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("thick"), F.const(2), F.const(0))).clamp(3, 8).round(),
            "喷股间隔", "两股墨弹之间隔多久；速度越快连喷越密，浓墨略慢。"),
        spread: formula(
            F.base(3.5).minus(F.stat("speed").minus(50).times(0.015).clamp(-1.5, 1.5)).clamp(1.5, 5).round(1),
            "喷射散布", {
                unit: "度",
                description: "墨弹相对瞄准方向的最大偏角；速度快的个体喷得更稳。"
            }),
        steer: formula(
            F.base(4).plus(F.stat("specialAttack").minus(50).times(0.03)).clamp(3, 7).round(1),
            "墨流修正", {
                unit: "度/刻",
                description: "每股墨弹逐刻朝目标转向的角度；特攻越高，墨流越会追上移动中的目标。"
            }),
        drops: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).times(0.16))
                .plus(F.level().minus(25).times(0.4)).clamp(12, 64).round(),
            "墨滴数量", {
                unit: "滴",
                description: "每股墨弹迸出的墨滴数，也驱动表现的密度；特攻与等级越高越多。"
            }),
        stainTicks: seconds(
            F.base(80).plus(F.stat("specialAttack").minus(50).times(0.4).clamp(-10, 24))
                .plus(F.level().minus(25).times(0.6).clamp(0, 20))
                .times(F.when(F.pref("thick"), F.const(1.3), F.const(1))).clamp(50, 200).round(),
            "墨渍时长", "落点地上那片墨渍停留多久，到期原方块回来；浓墨留得更久。"),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(50).times(0.04))
                .plus(F.when(F.pref("thick"), F.const(2), F.const(0))).clamp(6, 16).round(),
            "起手", "蓄好一口墨再喷出去的时间；速度越快越短，浓墨多花一点。")
    });

    defineDamage("octazooka", "shot", {});

    describe("octazooka", [
        { key: "description.0", values: ["shot", "shots", "chance", "blind"] },
        { key: "description.1", values: ["velocity", "reach", "interval", "spread"] },
        { key: "description.2", values: ["steer", "drops", "stainTicks", "pref.thick"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
