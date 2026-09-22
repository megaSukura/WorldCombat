/**
 * 万有引力 / gravapple 的参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 80／命中 100／PP 10／target normal／追加 100% 令目标防御 −1；
 * 原作在「重力」场地下威力 ×1.5（Cobblemon 1.8，1 位学习者：苹裹龙 / Flapple）。
 *
 * 翻译：原作把「从高处落下苹果」和一个叫「重力」的场地挂钩。这个世界没有重力场地，所以本招把「重力」落成
 * **苹果下落本身**：施法者把一颗大苹果送到目标正上方 `dropHeight` 格处松手，苹果在重力里越落越快，并像被
 * 目标的质心吸引一样自行修正落点（`pull`）。**离地的目标最重**：苹果追上它、把它砸回地面（下落冲量 `slam`），
 * 威力按原作 ×1.5；落地的目标只是挨一记重苹果。落地后苹果留在原地，谁都能捡。
 * 「降低防御」是 `NativeEffects.boost(...,"def",-N)` 加上共享身份 `world_combat:status/guardbroken`
 * （与撕裂爪/铁尾/暗影之骨/碎岩同一身份），因此别的破防招能接着消费这道缺口。
 *
 * 数据分散：
 *   impact          砸落威力：物攻定苹果的力道；配置与目标是否离地各乘一项。
 *   dropHeight      释放高度：身高定苹果被拎多高，等级定它还能再高多少。
 *   fallSpeed       下坠初速：体重定苹果本身多沉、落得多急。
 *   pull            引力修正：特攻定意念牵引的强度，目标体重定它被吸得多紧（越重越难甩开）。
 *   reach           施放距离：等级与身高决定能在多远的目标头上落苹果。
 *   collisionRadius 苹果判定：身高定苹果大小。
 *   crushStages     压碎等级：本招固定 1 级防御。
 *   crushTicks      压碎标记时长：等级定缺口留多久。
 *   slam            下落冲量：体重定把离地目标砸回地面的那一下有多重。
 *
 * 配置 `heavy`（重坠式）：开＝苹果更高更沉、砸得更重，但起手与冷却更久、施放距离更短（更难从远处安放）；
 * 关＝轻坠式，出手快、射程长、单发略轻。两向各有局面。
 *
 * 伤害段 `impact` 与参数同名，走共享换算；离地倍率写在同一棵公式里，出招时按现场目标求值。
 */
namespace PokemonSkills {
    actionParameters.define("gravapple", {
        /** 砸落威力：62 + 物攻偏移[−12,34]；目标离地 ×1.5，重坠 ×1.12 / 轻坠 ×0.94；夹 42..150。 */
        impact: formula(
            F.base(62)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-12, 34))
                .times(F.when(F.target("actor.grounded", text("worldcombat.skill.gravapple.value.targetGrounded")), F.const(1), F.const(1.5)))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.gravapple.preference.heavy")), F.const(1.12), F.const(0.94)))
                .clamp(42, 150).round(1),
            "砸落威力", {
                unit: "威力",
                description: "苹果砸实那一下的威力；物攻越高越重，砸在离地目标身上按原作再乘 1.5。对手防御、相性与暴击在命中时另算。"
            }),
        /** 释放高度：7 + 身高偏移[−1,4] + 等级(≥30)偏移[0,3]；重坠 ×1.35 / 轻坠 ×0.9；夹 5..16。 */
        dropHeight: formula(
            F.base(7)
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-1, 4))
                .plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.gravapple.preference.heavy")), F.const(1.35), F.const(0.9)))
                .clamp(5, 16).round(1),
            "释放高度", {
                unit: "格",
                description: "苹果被送到目标头顶多少格处再松手；个子高、等级高的人拎得更高。"
            }),
        /** 下坠初速：0.42 + 体重偏移[−0.06,0.16]；重坠 ×1.2 / 轻坠 ×0.92；夹 0.28..0.66。 */
        fallSpeed: formula(
            F.base(0.42).plus(F.body("weight").minus(300).times(0.0018).clamp(-0.06, 0.16))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.gravapple.preference.heavy")), F.const(1.2), F.const(0.92)))
                .clamp(0.28, 0.66).round(3),
            "下坠初速", {
                unit: "格/刻",
                description: "苹果离手时的下落速度；身体越沉的个体拎着的苹果越重、落得越急。"
            }),
        /** 引力修正：14 + 特攻偏移[−3,8] + 目标体重偏移[−3,10]；重坠 ×0.8；夹 6..34。 */
        pull: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-3, 8))
                .plus(F.target("individual.weight", text("worldcombat.skill.gravapple.value.targetWeight")).minus(300).times(0.004).clamp(-3, 10))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.gravapple.preference.heavy")), F.const(0.8), F.const(1.0)))
                .clamp(6, 34).round(1),
            "引力修正", {
                unit: "度/刻",
                description: "苹果在飞行中每秒刻朝目标修正的转角；特攻定牵引的强度，目标越重被吸得越紧、越难甩开。"
            }),
        /** 施放距离：8 + 等级(≥25)偏移[0,3.5] + 身高偏移[−0.3,1.2]；夹 6..13。 */
        reach: formula(
            F.base(8)
                .plus(F.level().minus(25).times(0.08).clamp(0, 3.5))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.3, 1.2))
                .clamp(6, 13).round(2),
            "施放距离", {
                unit: "格",
                description: "能在多远的目标头上落苹果；等级与身高越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 苹果判定：0.45 + 身高偏移[−0.05,0.3]；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.36, 0.8).round(2),
            "苹果判定", {
                unit: "格",
                description: "落下的苹果能砸到多大一圈；大个子拎的苹果更大。"
            }),
        /** 压碎等级：本招固定 1 级防御。 */
        crushStages: formula(
            F.base(1),
            "压碎等级", {
                unit: "级",
                description: "砸中时令目标防御下降的能力等级。"
            }),
        /** 压碎标记时长：80 + 等级(≥30)偏移[0,50]；重坠 ×1.2 / 轻坠 ×1.0；夹 60..240。 */
        crushTicks: seconds(
            F.base(80).plus(F.level().minus(30).times(1.1).clamp(0, 50))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.gravapple.preference.heavy")), F.const(1.2), F.const(1.0)))
                .clamp(60, 240).round(0),
            "压碎标记时长", "目标防御缺口停留的时长；等级越高留得越久。"),
        /** 下落冲量：0.7 + 体重偏移[−0.05,0.4]；夹 0.4..1.4；只在目标离地时把下坠加在它身上。 */
        slam: formula(
            F.base(0.7).plus(F.body("weight").minus(300).times(0.0018).clamp(-0.05, 0.4)).clamp(0.4, 1.4).round(2),
            "下落冲量", {
                unit: "格/刻",
                description: "苹果追上离地目标时，额外把多重的下坠加在它身上（把它砸回地面）；身体越沉砸得越重。"
            })
    });

    defineDamage("gravapple", "impact", {});

    stages("gravapple", [
        { level: 30, values: { impact: 70 } },
        { level: 48, values: { impact: 82, crushTicks: 110 } }
    ]);

    describe("gravapple", [
        { key: "description.0", values: ["impact", "collisionRadius"] },
        { key: "description.1", values: ["dropHeight", "fallSpeed", "pull"] },
        { key: "description.2", values: ["reach", "crushStages", "crushTicks", "slam"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.impact"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.impact", "tier.1.crushTicks"] }
    ]);
}
