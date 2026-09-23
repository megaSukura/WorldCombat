/**
 * 精神冲击 / psyshock —— 参数与伤害段。
 *
 * 原生事实：Psychic／分类特殊但**改按目标物理防御结算**（`overrideDefensiveStat: def`）／威力 80／命中 100／PP 10／
 *   单体／112 位学习者（Cobblemon 1.8，Showdown）。描述：「将神奇的念波实体化攻击对手。给予物理伤害。」
 *
 * 翻译：把「念波实体化」做成一枚**可以投出去的实心念力棱**——施法者把手前的念波压成一枚半透明的棱形实体，
 *   脱手后像一件有重量的东西一样走直线、随距离下坠，撞上时按物体的方式砸进去（对物理防御结算），
 *   并在接触面碎成一撮棱屑。它是念波家族里最快、最便宜的一发，身份是「实体投掷」。
 *   与同描述的精神击破分开：精神击破是头顶凝出的重物下砸、带冲击面与削特防；精神冲击只是一枚轻棱。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shard    棱击威力：特攻决定念波压得多实，等级让棱更凝。
 *   reach    射程：特攻决定念力够到多远。
 *   velocity 弹速：速度决定脱手那一瞬多急。
 *   gravity  下坠：特攻越高念力越紧，越不下坠。
 *   radius   判定半径：施法者体型（碰撞箱高度）。
 *   push     击退：特攻决定这一撞顶开多远。
 *   vanes    棱屑数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `heavy`（重棱）双向取舍：开启＝威力 ×1.22、击退 ×1.6、下坠 ×1.6，但弹速 ×0.8、射程 ×0.85、起手 +3 刻、
 *   冷却 +6 刻；关闭（轻棱）＝更远、更快、更飘的一掷，代价是威力与击退都轻。
 *
 * 伤害段 `shard` 走共享换算（原始类别 Special）；「按物理防御结算」写在该段 spec 的 `defenceStat: def`，
 * 预览与命中同算（本招只作用于自己）。
 */
namespace PokemonSkills {
    export const psyshockId = "psyshock";
    export const psyshockScene = "world_combat:move_psyshock";
    export const psyshockHitText = "world_combat.move.psyshock.text.hit";
    export const psyshockMissText = "world_combat.move.psyshock.text.miss";

    actionParameters.define(psyshockId, {
        /** 棱击威力：72 + 特攻偏移[−14,46] + 等级(≥30)偏移[0,14]，重棱 ×1.22 / 轻棱 ×0.9；夹 48..152。 */
        shard: formula(
            F.base(72)
                .plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-14, 46))
                .plus(F.level().minus(30).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("heavy"), F.const(1.22), F.const(0.9)))
                .clamp(48, 152).round(1),
            "棱击威力", {
                base: 72, unit: "威力",
                description: "念力棱撞上目标的基础威力；特攻越高念波压得越实，等级让棱更凝。对手按物理防御、相性与暴击在命中时另算。重棱式更重，轻棱式更轻。"
            }),
        /** 射程：13 + 特攻偏移[−2,4]，重棱 ×0.85 / 轻棱 ×1.1；夹 9..20。 */
        reach: formula(
            F.base(13)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 4))
                .times(F.when(F.pref("heavy"), F.const(0.85), F.const(1.1)))
                .clamp(9, 20).round(1),
            "射程", {
                base: 13, unit: "格",
                description: "念力棱能投多远；特攻越高够得越远，重棱式更沉、投得近，轻棱式更远。它也是本招的实际射程。"
            }),
        /** 弹速：1.15 + 速度偏移[−0.2,0.45]，重棱 ×0.8 / 轻棱 ×1.15；夹 0.7..2.0。 */
        velocity: formula(
            F.base(1.15)
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.45))
                .times(F.when(F.pref("heavy"), F.const(0.8), F.const(1.15)))
                .clamp(0.7, 2.0).round(2),
            "弹速", {
                unit: "格/刻",
                description: "棱脱手后每刻前进的距离；速度快的个体推得更急。重棱式更慢，轻棱式更快。"
            }),
        /** 下坠：0.020 − 特攻偏移[0,0.016]，重棱 ×1.6 / 轻棱 ×0.6；夹 0.004..0.032。 */
        gravity: formula(
            F.base(0.020)
                .minus(F.stat("specialAttack").minus(60).times(0.0004).clamp(0, 0.016))
                .times(F.when(F.pref("heavy"), F.const(1.6), F.const(0.6)))
                .clamp(0.004, 0.032).round(3),
            "下坠", {
                unit: "格/刻²",
                description: "实体感：念力越强越紧实，飞得越平；重棱式更沉、下坠更快，轻棱式几乎飘着走。"
            }),
        /** 判定半径：0.30 + 碰撞箱高度偏移[−0.06,0.18]；夹 0.22..0.55。 */
        radius: formula(
            F.base(0.30)
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.06, 0.18))
                .clamp(0.22, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "念力棱飞行与命中时的横向判定半径；大个子的棱更宽。"
            }),
        /** 击退：0.5 + 特攻偏移[−0.1,0.9]，重棱 ×1.6 / 轻棱 ×0.5；夹 0.2..2.2。 */
        push: formula(
            F.base(0.5)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.1, 0.9))
                .times(F.when(F.pref("heavy"), F.const(1.6), F.const(0.5)))
                .clamp(0.2, 2.2).round(2),
            "击退", {
                base: 0.5, unit: "格",
                description: "命中时把目标沿飞行方向顶开的距离；特攻越高推力越大。重棱式顶得更远，轻棱式几乎不推。"
            }),
        /** 棱屑数：14 + 特攻偏移[0,24] + 等级(≥25)偏移[0,10]；夹 14..50。 */
        vanes: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.14).clamp(0, 24))
                .plus(F.level().minus(25).times(0.25).clamp(0, 10))
                .clamp(14, 50).round(0),
            "棱屑数", {
                unit: "片",
                description: "念力棱撞碎时飞散的棱屑数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：11 − 速度偏移[−2,4]，重棱 +3；夹 6..18。 */
        tempo: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("heavy"), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "把念波压成实心棱的时间；速度越快压得越快，重棱式多压一拍。"),
        /** 收招：8 − 速度偏移[−1,2]；夹 4..11。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "掷出后的收势；速度越快收得越利落。"),
        /** 冷却：26 − 速度偏移[−4,6]，重棱 +6；夹 16..40。 */
        recharge: seconds(
            F.base(26)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("heavy"), F.const(6), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "再凝一枚棱之间的等待；速度越快回得越快，重棱式更久。")
    });

    defineDamage(psyshockId, "shard", { defenceStat: "def" });

    stages(psyshockId, [
        { level: 32, values: { shard: 88, reach: 14 } },
        { level: 48, values: { shard: 100, push: 1.2 } }
    ]);

    describe(psyshockId, [
        { key: "description.0", values: ["reach","shard"] },
        { key: "description.1", values: ["velocity","gravity","radius"] },
        { key: "description.2", values: ["push"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shard", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shard", "tier.1.push"] }
    ]);
}
