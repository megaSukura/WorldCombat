/**
 * 雷鸣蹴击 / thunderouskick 的参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 90／命中 100／PP 10／接触／追加 100% 令目标防御 −1
 * （Cobblemon 1.8，1 位学习者：伽勒尔闪电鸟 / Galarian Zapdos）。
 *
 * 翻译：把「以雷电般的动作戏耍对手的同时使出脚踢」落成一次**闪身绕步后从侧面踢出**——施法者以连续几次
 * 电光般的绕步（`feints`）在目标身侧来回换位，最后从它没在看的那一侧踢出一脚。只有真正走动的步才留残影、
 * 才算成功的绕步；脚踢能到的距离由站位与出脚伸展决定（`standoff + kickSpeed`），**不随目标剩余距离拉长**，
 * 所以侧路被墙挡住时只够原地短踢或踢空。脚踢把目标的护架踢开：
 * `NativeEffects.boost(...,"def",-N)` + 共享身份 `world_combat:status/guardbroken`（与破防一族同一身份）。
 * 「戏耍」体现在两处：实际成功绕步达到三次以上、目标越是正忙着打别人（`attacking` 不是自己），护架被踢得越开——
 * 这是本招可被读出、也可被反制的部分：背对或分神时挨得更狠。
 *
 * 数据分散：
 *   kick         踢击威力：物攻定脚劲，速度定出脚多快多狠；配置两向分配。
 *   feints       绕步次数：速度定能在目标身边闪几次，配置再补一次（实际能走到几步由地形决定）。
 *   blinkRange   绕步距离：身高定每一步跨多远。
 *   standoff     站位距离：目标体宽定侧身站位要多远才踢得到；与出脚速度一起决定脚的射程。
 *   kickSpeed    出脚速度：速度定最后一脚冲得多快，也定脚能伸多长。
 *   guardStages  踢开等级：配置决定踢开一级还是两级。
 *   feintBonus   戏耍加成：实际成功绕步达到三次以上时额外多踢开一级。
 *   guardTicks   护架缺口时长：等级定缺口留多久。
 *   push         顶开距离：体重定一脚把人踹多远。
 *   collisionRadius 脚踢判定：身高定脚掌范围。
 *
 * 配置 `patient`（戏耍式）：开＝多绕一步、一次踢开两级护架，但单发更轻、起手与冷却更久；
 * 关＝少绕一步、只踢开一级，但出脚更重更快。两向各有局面（先破防接力 / 抢伤害）。
 *
 * 伤害段 `kick` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("thunderouskick", {
        /** 踢击威力：72 + 物攻偏移[−14,44] + 速度偏移[−6,18]；戏耍 ×0.95 / 疾踢 ×1.08；夹 48..160。 */
        kick: formula(
            F.base(72)
                .plus(F.stat("attack").minus(60).times(0.42).clamp(-14, 44))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-6, 18))
                .times(F.when(F.pref("patient", text("worldcombat.skill.thunderouskick.preference.patient")), F.const(0.95), F.const(1.08)))
                .clamp(48, 160).round(1),
            "踢击威力", {
                unit: "威力",
                description: "最后踢实那一下的威力；物攻定脚劲、速度定出脚多快。对手防御、相性与暴击在命中时另算。"
            }),
        /** 绕步次数：2 + 速度偏移[−0.8,0.8] + 戏耍式 +1；夹 1..4。 */
        feints: formula(
            F.base(2)
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.8, 0.8))
                .plus(F.when(F.pref("patient", text("worldcombat.skill.thunderouskick.preference.patient")), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "绕步次数", {
                unit: "步",
                description: "出手前在目标身侧来回闪几次；速度越快、越戏耍，闪得越多，目标越难判断真正出脚的方向。"
            }),
        /** 绕步距离：1.8 + 身高偏移[−0.2,0.8]；夹 1.4..3.0。 */
        blinkRange: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8)).clamp(1.4, 3.0).round(2),
            "绕步距离", {
                unit: "格",
                description: "每一步电光绕步跨出多远；个子高的个体步幅更大。"
            }),
        /** 站位距离：1.5 + 目标体宽偏移[0,1.4]；夹 1.2..3.0。 */
        standoff: formula(
            F.base(1.5).plus(F.target("actor.width", text("worldcombat.skill.thunderouskick.value.targetWidth")).minus(0.9).times(0.8).clamp(0, 1.4)).clamp(1.2, 3.0).round(2),
            "站位距离", {
                unit: "格",
                description: "绕步时要离目标侧面多远才踢得到；目标碰撞箱越宽，侧身站位必须越远。"
            }),
        /** 出脚速度：0.9 + 速度偏移[−0.2,0.45]；夹 0.6..1.4。 */
        kickSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.45)).clamp(0.6, 1.4).round(2),
            "出脚速度", {
                unit: "格/刻",
                description: "最后一脚冲进目标的速度，也决定脚能伸到多远；速度快的个体出脚更急、够得更远。"
            }),
        /** 踢开等级：戏耍 2 级 / 疾踢 1 级。 */
        guardStages: formula(
            F.when(F.pref("patient", text("worldcombat.skill.thunderouskick.preference.patient")), F.const(2), F.const(1)),
            "踢开等级", {
                unit: "级",
                description: "一脚把目标护架踢开的能力等级；戏耍式踢开两级，疾踢式一级。"
            }),
        /** 戏耍加成：绕步达到三次以上时额外多踢开 1 级。 */
        feintBonus: formula(
            F.base(1),
            "戏耍加成", {
                unit: "级",
                description: "绕步闪到三次以上时，这一脚额外多踢开的级数——把对手晃到分神才踢得开。"
            }),
        /** 护架缺口时长：70 + 等级(≥30)偏移[0,50]；夹 50..220。 */
        guardTicks: seconds(
            F.base(70).plus(F.level().minus(30).times(1.1).clamp(0, 50)).clamp(50, 220).round(0),
            "护架缺口时长", "目标护架缺口停留的时长；等级越高留得越久。"),
        /** 顶开距离：0.35 + 体重偏移[−0.05,0.5]；夹 0.15..0.9。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(300).times(0.002).clamp(-0.05, 0.5)).clamp(0.15, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "一脚把目标踹开多远；身体越沉踹得越远。"
            }),
        /** 脚踢判定：0.45 + 身高偏移[−0.05,0.3]；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.36, 0.8).round(2),
            "脚踢判定", {
                unit: "格",
                description: "出脚时脚掌能踢到多大范围；大个子判定更宽。"
            })
    });

    defineDamage("thunderouskick", "kick", {}, { contact: true });

    stages("thunderouskick", [
        { level: 30, values: { kick: 80 } },
        { level: 50, values: { kick: 94, guardTicks: 100 } }
    ]);

    describe("thunderouskick", [
        { key: "description.0", values: ["kick","collisionRadius"] },
        { key: "description.1", values: ["feints", "blinkRange", "standoff"] },
        { key: "description.2", values: ["kickSpeed","guardStages","feintBonus","guardTicks","push"] },
        { key: "patient.on", values: [], when: function (context) { return read(context.detail.values, ["patient"]) === true; } },
        { key: "patient.off", values: [], when: function (context) { return read(context.detail.values, ["patient"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.guardTicks"] }
    ]);
}
