/**
 * 掷泥 / mudslap 的参数与伤害段。
 *
 * 原生事实：Ground、特殊、威力 20、命中 100、PP 10、目标单体，命中后必定降低 1 级命中（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「抓一把泥甩到对手脸上」翻成即时战斗里一件有形状的小事——泥团沿低弧线抛出，糊在脸上，
 * 眼睛被遮住，之后出手会偏。这一招必定生效，代价是本身很轻。
 * 命中下降是共享能力等级（`NativeEffects.boost(world, target, "accuracy", -n)`），和影子分身的闪避一样走全战斗者共有的载体。
 *
 * 数值来源（每项读不同的个体数据）：
 *   splat     特攻与等级决定泥团轻重；厚泥再乘 1.18。
 *   blind     特攻每满 100 加 1 级，基础 1 级；厚泥再多 1 级（夹 1..3）。
 *   mudTicks  体重与等级决定泥在脸上停留多久，也是致盲画面的时长。
 *   splash    体重与等级决定溅出的泥点数量，同时驱动表现的密度。
 *   arcSpeed  速度决定出手快慢，厚泥更沉更慢。
 *   radius    体型高度决定泥团判定大小。
 *   reach     特攻决定能甩多远。
 *   tempo     速度决定起手，厚泥多花一点时间。
 * 配置 thick（厚泥）双向取舍：泥团更重、糊得更深，但抛得更慢、起手与冷却更长。
 */
namespace PokemonSkills {
    actionParameters.define("mudslap", {
        splat: formula(
            F.base(20).plus(F.stat("specialAttack").minus(45).times(0.18).clamp(-6, 24))
                .plus(F.level().minus(20).times(0.35).clamp(0, 18))
                .times(F.when(F.pref("thick"), F.const(1.18), F.const(1)))
                .clamp(14, 62).round(1),
            "泥团威力", {
                unit: "威力",
                description: "泥团糊上那一下的基础威力；特攻与等级越高越重，厚泥再重一成多。对手防御、相性与暴击在命中时另算。"
            }),
        blind: formula(
            F.stat("specialAttack").div(100).floor().plus(1)
                .plus(F.when(F.pref("thick"), F.const(1), F.const(0)))
                .clamp(1, 3),
            "命中下降", {
                unit: "级",
                description: "必定削掉目标的命中能力等级；特攻每满 100 多加一级，厚泥再多一级。"
            }),
        mudTicks: seconds(
            F.base(40).plus(F.body("weight").times(0.12)).plus(F.level().times(0.4)).clamp(30, 96).round(),
            "糊眼时长", "泥在目标脸上停留多久，也是脸上泥迹画面的持续时间；越重、等级越高的个体糊得越久。"),
        splash: formula(
            F.base(14).plus(F.body("weight").times(0.12)).plus(F.level().times(0.35)).clamp(12, 72).round(),
            "泥点数量", {
                unit: "点",
                description: "泥团砸开时溅出的泥点数量，也驱动表现的密度；体重与等级越高越多。"
            }),
        arcSpeed: formula(
            F.base(0.85).plus(F.stat("speed").minus(45).times(0.005).clamp(-0.18, 0.35))
                .times(F.when(F.pref("thick"), F.const(0.82), F.const(1)))
                .clamp(0.6, 1.25).round(2),
            "抛掷速度", {
                unit: "格/刻",
                description: "泥团沿弧线飞出去的速度；速度快的个体抛得更快，厚泥更沉更慢。"
            }),
        gravity: formula(
            F.const(0.05), "下坠", {
                unit: "格/刻²",
                description: "泥团下坠的强度，是这一招「抛」的形状；抛物线让对手能从画面读出落点。"
            }),
        radius: formula(
            F.base(0.2).plus(F.body("height").times(0.05)).clamp(0.2, 0.36).round(2),
            "泥团半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高，泥团越大、越容易糊到脸上。"
            }),
        steer: formula(
            F.base(3.5).plus(F.stat("speed").minus(45).times(0.03)).clamp(3, 6).round(1),
            "泥团修正", {
                unit: "度/刻",
                description: "泥团逐刻朝目标修正的幅度；速度快的个体甩得更准，减少被走位躲开。"
            }),
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").minus(45).times(0.05)).clamp(8, 16).round(1),
            "投掷距离", {
                unit: "格",
                description: "能把泥团甩到多远；特攻高的个体甩得更远。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(45).times(0.05))
                .plus(F.when(F.pref("thick"), F.const(4), F.const(0))).clamp(6, 18).round(),
            "起手", "抓泥、团成团再甩出去的时间；速度越快越短，厚泥多花一点时间。")
    });

    defineDamage("mudslap", "splat", {});

    describe("mudslap", [
        { key: "description.0", values: ["splat","blind"] },
        { key: "description.1", values: ["arcSpeed", "reach", "radius", "steer"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
