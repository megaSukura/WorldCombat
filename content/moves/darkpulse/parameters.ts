/**
 * 恶之波动 / darkpulse —— 参数与伤害段。
 *
 * 原生事实：Dark／特殊／威力 80／命中 100／PP 15／目标单体（any）／20% 畏缩／pulse。
 *
 * 翻译：把「从体内发出充满恶意的恐怖气场」落成一团从胸口涌出的暗色气场，朝玩家选定的落点铺过去；
 * 抵达（或半路撞上人）时炸开成一片恶意领域，范围内每个敌人各挨一记特殊伤害，可能被恐惧攥住而愣住。
 * 与同族的区分：
 *   恶之波动是一团会飞行、到点炸成一片领域的黑气，可以罩住挤在落点周围的人；
 *   打鼾是睡梦中朝一个目标即时喷出的鼾声，只打一个人。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   aura         气场威力 66 + 特攻偏移 + 等级台阶；弥漫 ×0.85 / 凝聚 ×1.15。
 *   bloom        落点气场半径 3.0 + 特攻偏移 + 体型高度偏移（身子大的个体气场铺得更开）；弥漫 ×1.3 / 凝聚 ×0.78。
 *   velocity     气场飞行速度 1.35 + 速度偏移；弥漫 ×0.82 / 凝聚 ×1.08。
 *   reach        射程 11 + 特攻偏移 + 等级；它也是本招的实际射程来源。
 *   radius       飞行判定 0.28 格 + 体型高度偏移。
 *   flinchChance 畏缩几率 0.20（原生）+ 特攻偏移；弥漫 ×1.12 / 凝聚 ×0.9。
 *   flinchTicks  畏缩持续 15 刻 + 等级偏移。
 *   lingerTicks  余韵停留 70 刻 + 等级偏移（炸开的恶意领域留多久）。
 *   motes        碎缕数 16 + 特攻偏移 + 等级偏移，驱动表现的密度。
 *   tempo        起手 12 刻 − 速度偏移 + 弥漫 2 刻。
 *
 * 配置 `creep`（弥漫）：开启＝气场更大更久、畏缩更易、飞得更慢，但威力略低、冷却更长；关闭＝更快更小更重。
 *
 * 伤害段 `aura` 与参数同名，走共享换算（原生类别 Special，Dark 属性）。畏缩由本单元的
 * `world_combat:darkpulse_flinch` 承载，带共享身份 `world_combat:status/flinch`。
 */
namespace PokemonSkills {
    actionParameters.define("darkpulse", {
        /** 气场威力：66 + 特攻偏移[−16,34]；弥漫 ×0.85 / 凝聚 ×1.15；夹 40..120。 */
        aura: formula(
            F.base(66)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-16, 34))
                .times(F.when(F.pref("creep"), F.const(0.85), F.const(1.15)))
                .clamp(40, 120).round(1),
            "气场威力", {
                unit: "威力",
                description: "炸开时每个被罩住的敌人各挨的一记；特攻越高恶意越重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 落点气场半径：3.0 + 特攻偏移[−0.5,1.2] + 身高偏移[−0.3,0.9]；弥漫 ×1.3 / 凝聚 ×0.78；夹 1.8..6。 */
        bloom: formula(
            F.base(3.0)
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.5, 1.2))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.3, 0.9))
                .times(F.when(F.pref("creep"), F.const(1.3), F.const(0.78)))
                .clamp(1.8, 6).round(2),
            "气场半径", {
                unit: "格",
                description: "飞到落点后炸开的恶意领域有多大；特攻越高、个体越大铺得越开。它也是指示圈的半径。"
            }),
        /** 飞行速度：1.35 + 速度偏移[−0.25,0.5]；弥漫 ×0.82 / 凝聚 ×1.08；夹 0.8..2.2。 */
        velocity: formula(
            F.base(1.35).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.25, 0.5))
                .times(F.when(F.pref("creep"), F.const(0.82), F.const(1.08)))
                .clamp(0.8, 2.2).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "气场铺出去的速度；速度快的个体推得更急，目标更难在半路走开。"
            }),
        /** 射程：11 + 特攻偏移[−1.5,4] + 等级偏移[0,3]；夹 8..18。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4))
                .plus(F.level().minus(28).times(0.06).clamp(0, 3))
                .clamp(8, 18).round(2),
            "射程", {
                unit: "格",
                description: "恶意气场能送到多远的地面；特攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 飞行判定：0.28 + 身高偏移[−0.05,0.14]；夹 0.22..0.5。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.05, 0.14)).clamp(0.22, 0.5).round(2),
            "飞行判定", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高的个体吐出的气场越大。"
            }),
        /** 畏缩几率：0.20 + 特攻偏移[−0.05,0.12]；弥漫 ×1.12 / 凝聚 ×0.9；夹 0.12..0.4。 */
        flinchChance: percent(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.05, 0.12))
                .times(F.when(F.pref("creep"), F.const(1.12), F.const(0.9))).clamp(0.12, 0.40),
            "畏缩几率", "被恶意气场罩住时的基础畏缩几率（原生 20%）；特攻越高越容易把人攥住，弥漫形态更高。"),
        /** 畏缩持续：15 + 等级偏移[0,5]；夹 12..22。 */
        flinchTicks: seconds(
            F.base(15).plus(F.level().minus(28).times(0.12).clamp(0, 5)).clamp(12, 22).round(0),
            "畏缩持续", "被恐惧攥住的人在这段时间内无法开始新动作；等级越高愣得越久。"),
        /** 余韵停留：70 + 等级偏移[0,40] + 弥漫 +20；夹 50..150。 */
        lingerTicks: seconds(
            F.base(70).plus(F.level().minus(28).times(1.0).clamp(0, 40))
                .plus(F.when(F.pref("creep"), F.const(20), F.const(0))).clamp(50, 150).round(0),
            "余韵停留", "炸开的恶意领域在落点停留多久；等级越高、弥漫形态留得越久。"),
        /** 碎缕数：16 + 特攻偏移[−4,32] + 等级偏移[0,12]；夹 12..54。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-4, 32))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12)).clamp(12, 54).round(),
            "碎缕数", {
                unit: "缕",
                description: "气场炸开时迸出的恶意碎缕数，也驱动表现的密度；特攻与等级越高越碎。"
            }),
        /** 起手：12 − 速度偏移[−2,4] + 弥漫 2；夹 6..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.06).clamp(-2, 4))
                .plus(F.when(F.pref("creep"), F.const(2), F.const(0))).clamp(6, 16).round(0),
            "起手", "把恶意从体内逼出来再推出去的时间；速度越快越短，弥漫形态多花一点。"),
        /** 收招：8 刻；气场炸开后收住。 */
        settle: seconds(F.base(8).clamp(4, 14).round(0), "收招", "气场出手后收住的时间。"),
        /** 冷却：32 − 速度偏移[−3,5] + 弥漫 4；夹 22..44。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("creep"), F.const(4), F.const(0))).clamp(22, 44).round(0),
            "冷却", "这一次恶意推出去之后多久能再聚起一团；速度快的个体回得更快。")
    });

    defineDamage("darkpulse", "aura", {});

    stages("darkpulse", [
        { level: 40, values: { aura: 84, reach: 13 } },
        { level: 55, values: { aura: 96, bloom: 3.6, flinchChance: 0.30 } }
    ]);

    describe("darkpulse", [
        { key: "description.0", values: ["aura","bloom"] },
        { key: "description.1", values: ["reach","velocity","radius"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "creep.on", values: [], when: function (context) { return read(context.detail.values, ["creep"]) === true; } },
        { key: "creep.off", values: [], when: function (context) { return read(context.detail.values, ["creep"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.aura", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.aura", "tier.1.bloom", "tier.1.flinchChance"] }
    ]);
}
