/**
 * 起风 / gust —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 40／命中 100／PP 35／优先度 0／非接触（Cobblemon 1.8 / Showdown）。
 *   描述「用翅膀将刮起的狂风袭向对手进行攻击。」
 *
 * 翻译：把「振翅扇出一阵狂风」落成**一记短促的压缩风弹**——它沿直线弹向一个目标，命中就把它沿风的
 *   方向推开；对手要是正离地，这一记把它吹得更远。它是飞系里最便宜、回得最快的远程一记（PP 35），
 *   命中 100 翻成「会小幅修向目标、几乎不落空」。这是它和空气斩（一道薄月牙直线切开）、空气利刃（张开
 *   一整片扇面）、暴风（一堵会走的宽风墙）分开的地方：起风是一发即散、用来推人的小风团。
 *
 * 配置 `shove`（推风式）双向取舍：开＝推开 ×1.4、半径略收、更黏人，代价是威力 ×0.85、起手 +1 刻；
 *   关（削风式）＝威力 ×1.15、推得近（×0.7），更像一记便宜的远程消耗。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blast   风弹威力 ← 特攻＋等级，shove ×0.85 / 削风 ×1.15。
 *   velocity 风弹速度 ← 速度。
 *   push    推开距离 ← 特攻，shove ×1.4 / 削风 ×0.7；命中离地目标时再 ×1.8。
 *   radius  风团判定 ← 体型高度（大个子扇出的风团更大）。
 *   reach   射程 ← 特攻＋等级，也是本招实际射程来源。
 *   motes   风团量 ← 特攻。
 *   tempo／aftercast／recharge ← 速度。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原始类别 Special）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("gust", {
        /** 风弹威力：28 + 特攻偏移[−8,22] + 等级(≥20)偏移[0,7]；shove ×0.85 / 削风 ×1.15；夹 16..58。 */
        blast: formula(
            F.base(28)
                .plus(F.stat("specialAttack").minus(50).times(0.14).clamp(-8, 22))
                .plus(F.level().minus(20).times(0.25).clamp(0, 7))
                .times(F.when(F.pref("shove", text("worldcombat.skill.gust.preference.shove")), F.const(0.85), F.const(1.15)))
                .clamp(16, 58).round(1),
            "风弹威力", {
                unit: "威力",
                description: "这一记压缩风弹砸上去的威力；特攻越高风越烈，等级越高也越沉。推风式把力道分给了推力。对手防御、相性与暴击在命中时另算。"
            }),
        /** 风弹速度：1.4 + 速度偏移[−0.1,0.4]；夹 1.0..2.0。 */
        velocity: formula(
            F.base(1.4).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.1, 0.4)).clamp(1.0, 2.0).round(2),
            "风弹速度", {
                unit: "格/刻",
                description: "风弹弹出的速度；速度快的个体扇得更急，对手更来不及侧身。"
            }),
        /** 推开距离：0.8 + 特攻偏移[−0.2,0.7]；shove ×1.4 / 削风 ×0.7；夹 0.4..1.8。 */
        push: formula(
            F.base(0.8).plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.2, 0.7))
                .times(F.when(F.pref("shove", text("worldcombat.skill.gust.preference.shove")), F.const(1.4), F.const(0.7)))
                .clamp(0.4, 1.8).round(2),
            "推开距离", {
                unit: "格",
                description: "命中的目标沿风的方向被推开多远；特攻越高推得越远。命中正离地的目标时再乘 1.8——风把它吹得更远。推风式推得更开。"
            }),
        /** 风团判定：0.55 + 体型高度偏移[−0.1,0.4]；shove ×0.9；夹 0.4..1.0。 */
        radius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.4))
                .times(F.when(F.pref("shove", text("worldcombat.skill.gust.preference.shove")), F.const(0.9), F.const(1.0)))
                .clamp(0.4, 1.0).round(2),
            "风团判定", {
                unit: "格",
                description: "这一团风能兜住多大一圈；大个子扇出的风团更大。画出的风团大小与它一致。"
            }),
        /** 射程：9 + 特攻偏移[−1,2] + 等级(≥20)偏移[0,2.5]；夹 7..13。 */
        reach: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(50).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(20).times(0.06).clamp(0, 2.5))
                .clamp(7, 13).round(1),
            "射程", {
                unit: "格",
                description: "风弹能送到多远的目标；特攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 风团量：14 + 特攻偏移[−3,12]；夹 10..28。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").minus(50).times(0.12).clamp(-3, 12)).clamp(10, 28).round(0),
            "风团量", {
                unit: "团",
                description: "风弹里卷着的气团数量，由特攻换算；它驱动飞行与爆开的表现密度，不是独立伤害。"
            }),
        /** 起手：5 刻 − 速度偏移[0,1.2]；shove +1；夹 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("shove", text("worldcombat.skill.gust.preference.shove")), F.const(1), F.const(0)))
                .clamp(3, 8).round(0),
            "起手", "振翅把空气压成一团的时间；速度越快越短，推风式要多攒一下。"),
        /** 收招：6 刻 − 速度偏移[0,1]；夹 3..8。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1)).clamp(3, 8).round(0),
            "收招", "扇完之后收回翅膀的时间；快的个体更利落。"),
        /** 冷却：14 刻 − 速度偏移[0,2]；夹 9..20。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(50).times(0.03).clamp(-1.5, 2)).clamp(9, 20).round(0),
            "冷却", "再扇出一团风前的等待；这一记便宜、回得快，可以反复扇。")
    });

    defineDamage("gust", "blast", {}, { flags: { wind: true } });

    stages("gust", [
        { level: 22, values: { blast: 34 } },
        { level: 40, values: { blast: 44, reach: 11 } }
    ]);

    describe("gust", [
        { key: "description.0", values: ["blast", "radius"] },
        { key: "description.1", values: ["velocity", "reach"] },
        { key: "description.2", values: ["push"] },
        { key: "shove.on", values: [], when: function (context) { return read(context.detail.values, ["shove"]) === true; } },
        { key: "shove.off", values: [], when: function (context) { return read(context.detail.values, ["shove"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.reach"] }
    ]);
}
