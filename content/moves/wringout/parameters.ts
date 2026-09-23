/**
 * 绞紧 / wringout —— 参数、数值来源与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、特殊、威力 0、命中 100、PP 5、接触、单体；
 *   威力 = ⌊目标当前 HP / 最大 HP × 120⌋（下限 1）——**对手的 HP 越多，威力越大**。
 *
 * 翻译：把「用力勒紧对手」落成**一圈从脚到头拧上去的力**——一束螺旋气缠上目标，越拧越紧，把它的力气从身体里
 *   绞出来、化作上飞的流光。它读的同样是**目标此刻还剩多少**：对手越满，拧出的越多。与同族分开：它是三压招里
 *   唯一以**特攻**驱动、也是唯一可以**绞两段**的一记（双绞式），轮廓是围绕目标的螺旋，而非上方的压柱或两侧的合掌。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   wring        绞紧威力：特攻决定拧进去多深，等级给一点分寸；再乘上「目标完整度」系数（满血最重、残血最轻）。
 *   reach        伸手距离：身高给臂／蔓的长度，也是实际射程来源。
 *   coilRadius   螺旋半径：碰撞箱宽度决定缠得多开。
 *   coil         螺旋时长：等级决定这一拧持续几刻。
 *   secondFactor 第二段倍率：特攻决定再拧一下的余劲（双绞式）。
 *   gap          两段间隔：速度决定两拧之间隔多久（双绞式）。
 *   motes        流光数：特攻与等级换算，驱动画面的螺旋与流光量。
 *   tempo／aftercast／recharge：速度定节奏；双绞式更慢更费。
 *
 * 配置 `twin`（双绞式，默认关）双向取舍：开＝拧完一记后隔 `gap` 再拧一记（第二段按目标当时的血量重算、约再吃
 *   `secondFactor` 倍），代价是单段威力 ×0.89、起手 +2 刻、冷却 +5 刻；关（单绞式）＝一记拧完，单段更重、更快。
 *
 * 伤害段 `wring`：目标完整度在**命中时按每个目标自己的血量重算**（见 defineDamage 的 resolve）。
 */
namespace PokemonSkills {
    export const wringoutId = "wringout";
    export const wringoutScene = "world_combat:move_wringout";
    /** 表现里的参考半径（格）：服务端传 scale = 实际螺旋半径 / 这个值。 */
    export const wringoutReference = 1.2;

    /** 「目标完整度」系数：0.30（残血）～1.0（满血）；未知读作 0.30，预览不虚高。 */
    function wringoutScale(): Formula.Node {
        return F.const(0.30).plus(
            F.target("actor.healthRatio", text("worldcombat.skill.wringout.value.hpRatio")).times(0.70))
            .as(text("worldcombat.skill.wringout.value.healthFactor"));
    }

    actionParameters.define(wringoutId, {
        /** 绞紧威力：86 + 特攻偏移[−18,48] + 等级偏移[−4,10]；× 完整度(0.30..1)；双绞 ×0.89；夹 36..190。 */
        wring: formula(
            F.base(86)
                .plus(F.stat("specialAttack").minus(60).times(0.55).clamp(-18, 48))
                .plus(F.level().minus(25).times(0.2).clamp(-4, 10))
                .times(wringoutScale())
                .times(F.when(F.pref("twin", text("worldcombat.skill.wringout.preference.twin")), F.const(0.89), F.const(1.12)))
                .clamp(36, 190).round(1),
            "绞紧威力", {
                unit: "威力",
                description: "这一拧从目标身上绞出的威力；特攻越高拧得越深。目标剩余生命越满，系数越高（0.30～1.0，每个人各算各的）。对手特防、相性与暴击在命中时另算。"
            }),
        /** 伸手距离：2.3 + (高度−1.4)×0.3[−0.2,0.7]；夹 1.7..3.2。 */
        reach: formula(
            F.base(2.3).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.2, 0.7)).clamp(1.7, 3.2).round(2),
            "伸手距离", {
                unit: "格",
                description: "这一拧能够到多远，也是本招的实际射程来源；体型越高大伸得越远。"
            }),
        /** 螺旋半径：0.95 + (宽度−0.9)×0.5[−0.15,0.6]；夹 0.7..1.8。 */
        coilRadius: formula(
            F.base(0.95).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.15, 0.6)).clamp(0.7, 1.8).round(2),
            "螺旋半径", {
                unit: "格",
                description: "这股力缠住目标时离身体多远；身板越宽缠得越开。判定与表现同径。"
            }),
        /** 螺旋时长：18 + (等级−25)×0.2[0,6]；夹 14..26。 */
        coil: seconds(
            F.base(18).plus(F.level().minus(25).times(0.2).clamp(0, 6)).clamp(14, 26).round(0),
            "螺旋时长", "这一拧从缠上到收拢持续多久；等级越高拧得越久，画面的螺旋也按它拉长。"),
        /** 第二段倍率：0.9 + 特攻偏移[−0.05,0.06]；夹 0.82..0.98（双绞式）。 */
        secondFactor: formula(
            F.base(0.9).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.06)).clamp(0.82, 0.98).round(2),
            "第二段倍率", {
                unit: "倍",
                description: "双绞式再拧一下时，以目标当时的血量重算后再乘的倍率；特攻越高余劲越足。"
            }),
        /** 两段间隔：9 − (速度−55)×0.02[−1.5,2]；夹 6..12。 */
        gap: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(6, 12).round(0),
            "两段间隔", "双绞式两拧之间隔几刻；速度快的个体接得更紧，留给对手挣脱的空档更短。"),
        /** 流光数：16 + 特攻偏移[−4,18] + 等级偏移[−2,5]；夹 12..44。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-4, 18))
                .plus(F.level().minus(25).times(0.1).clamp(-2, 5)).clamp(12, 44).round(0),
            "流光数", {
                unit: "条",
                description: "被绞出的流光与螺旋点的数量，驱动画面密度；特攻越高、等级越高绞出得越多。"
            }),
        /** 起手：8 − (速度−55)×0.02[−1.5,2]；双绞 +2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("twin", text("worldcombat.skill.wringout.preference.twin")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "从聚力到缠上目标的时间；速度越快越短，双绞式要多起一势。"),
        /** 收招：7 − (速度−55)×0.015[−1,1.5]；双绞 +1；夹 4..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5))
                .plus(F.when(F.pref("twin", text("worldcombat.skill.wringout.preference.twin")), F.const(1), F.const(0)))
                .clamp(4, 11).round(0),
            "收招", "绞完松手的时间；速度快的个体更利落，双绞式多拧一下多一拍。"),
        /** 冷却：24 − (等级−25)×0.1[0,4]；双绞 +5；夹 16..36。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(25).times(0.1).clamp(0, 4))
                .plus(F.when(F.pref("twin", text("worldcombat.skill.wringout.preference.twin")), F.const(5), F.const(0)))
                .clamp(16, 36).round(0),
            "冷却", "再拧一记前的等待；等级越高回得越快，双绞式更费。")
    });

    defineDamage(wringoutId, "wring", { defenceCoefficient: 0.0046,
        rationale: "绞力绕过正面护甲直取身体，对特防的穿透略强，让「拧满血目标」的差别更可见。" }, {
        contact: true,
        // 每个目标各自结算：命中时用该目标自己的血量重算绞紧威力，完整度系数落到**这个人**身上。
        resolve: function (damage: PokemonDamage.FeatureContext) {
            return damage.facts ? { power: actionParameters.rules.formulaValue(wringoutId + "/wring", damage.facts) } : undefined;
        }
    });

    stages(wringoutId, [
        { level: 28, values: { wring: 98 } },
        { level: 46, values: { wring: 116, coilRadius: 1.15 } }
    ]);

    describe(wringoutId, [
        { key: "description.0", values: ["wring"] },
        { key: "description.1", values: ["reach"] },
        { key: "twin.on", values: ["gap", "secondFactor"], when: function (context) { return read(context.detail.values, ["twin"]) === true; } },
        { key: "twin.off", values: [], when: function (context) { return read(context.detail.values, ["twin"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wring"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wring"] }
    ]);
}
