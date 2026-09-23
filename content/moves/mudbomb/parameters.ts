/**
 * 泥巴炸弹 / mudbomb 的参数与伤害段。
 *
 * 原生事实：Ground、特殊、威力 65、命中 85、PP 10、bullet、目标单体，30% 概率降低 1 级命中（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「发射坚硬的泥弹」翻成一条直线高速飞行的实心泥球——它带着冲力砸在目标身上，炸开成泥雾，
 * 泼溅到周围，地上留下一小片湿泥；有时泥雾会糊住对手的眼睛。伤害比掷泥重，但只有约三成机会削命中。
 *
 * 数值来源（每项读不同的个体数据）：
 *   boom        特攻为主、物攻为辅、再叠等级；碎壳形态单体重 ×0.82。
 *   splash      炸开泼溅到附近其他敌人的威力，由特攻决定。
 *   blastRadius 体型高度与特攻决定爆开范围；碎壳形态再 ×1.35。
 *   velocity    速度决定弹速；碎壳更轻更快。
 *   radius      体型高度决定泥弹判定。
 *   reach       特攻决定能打多远。
 *   blind       特攻每满 120 加一级命中下降。
 *   chance      原生 30% 的致盲概率，作为这一招的性格保留。
 *   shards      特攻与等级决定炸开的泥块碎数，同时驱动表现。
 *   patchTicks  等级与特攻决定地上泥坑留多久。
 *   tempo       速度决定起手，碎壳多花一点时间。
 * 配置 shell（碎壳）双向取舍：爆开范围更大、泼溅更广、飞得更快，但单体重更轻、起手更慢。
 */
namespace PokemonSkills {
    actionParameters.define("mudbomb", {
        boom: formula(
            F.base(58).plus(F.stat("specialAttack").minus(50).times(0.28).clamp(-8, 30))
                .plus(F.stat("attack").minus(50).times(0.12).clamp(-4, 14))
                .plus(F.level().minus(25).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("shell"), F.const(0.82), F.const(1)))
                .clamp(38, 110).round(1),
            "泥弹威力", {
                unit: "威力",
                description: "实心泥球砸在目标身上的基础威力；特攻为主、物攻为辅，等级带来成长，碎壳把能量摊到爆开上所以单体重更轻。对手防御、相性与暴击在命中时另算。"
            }),
        splash: formula(
            F.base(24).plus(F.stat("specialAttack").minus(50).times(0.12).clamp(-4, 16)).clamp(14, 48).round(1),
            "泼溅威力", {
                unit: "威力",
                description: "泥弹炸开后泼溅到附近其他敌人的威力；特攻越高越重。"
            }),
        blastRadius: formula(
            F.base(2.0).plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.3, 0.9))
                .times(F.when(F.pref("shell"), F.const(1.35), F.const(1)))
                .clamp(1.4, 4.0).round(2),
            "爆开范围", {
                unit: "格",
                description: "泥弹炸开、泼溅能够到的半径；大个子、特攻高、碎壳形态更广。"
            }),
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("shell"), F.const(1.1), F.const(1)))
                .clamp(0.85, 1.7).round(2),
            "弹速", {
                unit: "格/刻",
                description: "泥弹直线飞行的速度；越快越难被走位躲开，碎壳更轻更快。"
            }),
        gravity: formula(
            F.const(0.02), "下坠", {
                unit: "格/刻²",
                description: "泥弹的轻微下坠；比掷泥的抛物线更平直。"
            }),
        radius: formula(
            F.base(0.18).plus(F.body("height").times(0.05)).clamp(0.18, 0.36).round(2),
            "泥弹半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高泥弹越大。"
            }),
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(50).times(0.07)).clamp(11, 22).round(1),
            "射程", {
                unit: "格",
                description: "能把泥弹打到多远；特攻高的个体打得更远。"
            }),
        blind: formula(
            F.stat("specialAttack").div(120).floor().plus(1).clamp(1, 2),
            "命中下降", {
                unit: "级",
                description: "致盲成功时削掉的命中能力等级；特攻每满 120 多加一级。"
            }),
        chance: percent(
            F.const(0.30), "致盲概率",
            "泥雾糊住眼睛的概率；这一招只有约三成机会削命中。"),
        shards: formula(
            F.base(12).plus(F.stat("specialAttack").minus(50).times(0.12))
                .plus(F.level().minus(25).times(0.3)).clamp(10, 44).round(),
            "泥块碎数", {
                unit: "块",
                description: "炸开时迸出的泥块碎数，也驱动表现的密度；特攻与等级越高越碎。"
            }),
        patchTicks: seconds(
            F.base(90).plus(F.level().times(1.2)).plus(F.stat("specialAttack").minus(50).times(0.3).clamp(-10, 20))
                .clamp(60, 200).round(),
            "泥坑时长", "落点地上那片湿泥停留多久，到期原方块回来。"),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(50).times(0.05))
                .plus(F.when(F.pref("shell"), F.const(2), F.const(0))).clamp(7, 18).round(),
            "起手", "把泥压实成弹再掷出的时间；速度越快越短，碎壳装药多花一点。")
    });

    defineDamage("mudbomb", "boom", {});
    defineDamage("mudbomb", "splash", {});

    describe("mudbomb", [
        { key: "description.0", values: ["boom","chance","blind"] },
        { key: "description.1", values: ["splash","blastRadius"] },
        { key: "description.2", values: ["velocity","reach","patchTicks","pref.shell"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
