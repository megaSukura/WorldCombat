/**
 * 捏碎 / crushgrip —— 参数、数值来源与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、物理、威力 0、命中 100、PP 5、接触、单体；
 *   威力 = ⌊目标当前 HP / 最大 HP × 120⌋（下限 1）——**对手剩余的 HP 越多，威力越大**。唯一学习者：雷吉奇卡斯。
 *
 * 翻译：把「用骇人的力量捏碎对手」落成**一只巨力手从两侧合拢**——先浮出两片半透明的掌影向目标合拢，捏住的那一下
 *   按对手此刻的完整度结算；高举式再把它整个人提离地面、按住一瞬，然后砸回地面补一记。它读的同样是**目标此刻还剩
 *   多少**，是三压招里最重、最慢、最贵的一记，也是唯一**会改变目标位置**的一记。轮廓是两侧合拢的掌，不是上方的压柱
 *   或缠绕的螺旋。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   grip        捏合威力：物攻决定握力，体重给合拢的分量；再乘上「目标完整度」系数（满血最重、残血最轻）。
 *   gripRadius  掌口半径：碰撞箱宽度决定两掌张得多开。
 *   reach       伸手距离：身高给臂长，也是实际射程来源。
 *   lift        提起初速：体重决定把目标抬多高（高举式）。
 *   hold        滞空时长：等级决定提起来按多久（高举式）。
 *   drop        回落初速：体重决定砸下去多急（高举式）。
 *   slam        落地追加：体重与物攻决定砸回地面的那一记（高举式，不随目标血量变化）。
 *   holdTicks   落地定身：等级决定摔落后目标被按住多久（高举式）。
 *   motes       碎屑数：物攻与体重换算，驱动画面密度。
 *   tempo／aftercast／recharge：速度定节奏；高举式更慢更费。
 *
 * 配置 `hoist`（高举式，默认关）双向取舍：开＝捏住后把目标提起、按住再摔下，追加一记 `slam` 并短暂定身，代价是
 *   起手 +4 刻、收招 +4 刻、冷却 +8 刻，且首段 `grip` ×0.9；关（原地捏碎式）＝一记捏完，首段更重、更快。
 *
 * 伤害段 `grip`：目标完整度在**命中时按每个目标自己的血量重算**（见 defineDamage 的 resolve）；`slam` 是固定段。
 */
namespace PokemonSkills {
    export const crushgripId = "crushgrip";
    export const crushgripScene = "world_combat:move_crushgrip";
    /** 表现里的参考半径（格）：服务端传 scale = 实际掌口半径 / 这个值。 */
    export const crushgripReference = 0.7;

    /** 「目标完整度」系数：0.28（残血）～1.0（满血）；未知读作 0.28，预览不虚高。 */
    function crushgripScale(): Formula.Node {
        return F.const(0.28).plus(
            F.target("actor.healthRatio", text("worldcombat.skill.crushgrip.value.hpRatio")).times(0.72))
            .as(text("worldcombat.skill.crushgrip.value.healthFactor"));
    }

    actionParameters.define(crushgripId, {
        /** 捏合威力：92 + 物攻偏移[−20,52] + 体重偏移[−6,26]；× 完整度(0.28..1)；高举 ×0.9 / 原地 ×1.05；夹 40..200。 */
        grip: formula(
            F.base(92)
                .plus(F.stat("attack").minus(60).times(0.6).clamp(-20, 52))
                .plus(F.body("weight").minus(50).times(0.12).clamp(-6, 26))
                .times(crushgripScale())
                .times(F.when(F.pref("hoist", text("worldcombat.skill.crushgrip.preference.hoist")), F.const(0.9), F.const(1.05)))
                .clamp(40, 200).round(1),
            "捏合威力", {
                unit: "威力",
                description: "两掌合拢捏住目标那一下的威力；物攻决定握力、体重给合拢的分量。目标剩余生命越满，系数越高（0.28～1.0，每个人各算各的）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掌口半径：0.7 + (宽度−0.9)×0.4[−0.1,0.5]；夹 0.55..1.3。 */
        gripRadius: formula(
            F.base(0.7).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.5)).clamp(0.55, 1.3).round(2),
            "掌口半径", {
                unit: "格",
                description: "两掌合拢时围住目标多大一圈；身板越宽掌口越大。判定与表现同径。"
            }),
        /** 伸手距离：2.4 + (高度−1.4)×0.55[0,2.4]；夹 2.0..4.8。巨型使用者（如雷吉奇卡斯）的掌能伸得更远。 */
        reach: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.55).clamp(0, 2.4)).clamp(2.0, 4.8).round(2),
            "伸手距离", {
                unit: "格",
                description: "这一握能够到多远，也是本招的实际射程来源；体型越高大伸得越远——巨型使用者需要更长的臂展才够得到对手。"
            }),
        /** 提起初速：0.5 + (体重−50)×0.003[−0.05,0.4]；夹 0.35..0.9。 */
        lift: formula(
            F.base(0.5).plus(F.body("weight").minus(50).times(0.003).clamp(-0.05, 0.4)).clamp(0.35, 0.9).round(2),
            "提起初速", {
                unit: "格/刻",
                description: "高举式把目标提离地面的初速；身体越沉提得越高。"
            }),
        /** 滞空时长：9 + (等级−30)×0.1[0,4]；夹 7..13。 */
        hold: seconds(
            F.base(9).plus(F.level().minus(30).times(0.1).clamp(0, 4)).clamp(7, 13).round(0),
            "滞空时长", "高举式把目标提在空中按住多久再摔下；等级越高按得越久。"),
        /** 回落初速：0.6 + (体重−50)×0.004[−0.08,0.5]；夹 0.4..1.1。 */
        drop: formula(
            F.base(0.6).plus(F.body("weight").minus(50).times(0.004).clamp(-0.08, 0.5)).clamp(0.4, 1.1).round(2),
            "回落初速", {
                unit: "格/刻",
                description: "高举式把目标砸回地面的初速；身体越沉砸得越急。"
            }),
        /** 落地追加：26 + 体重偏移[−4,26] + 物攻偏移[−4,20]；夹 14..80（不随目标血量变化）。 */
        slam: formula(
            F.base(26).plus(F.body("weight").minus(50).times(0.09).clamp(-4, 26))
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 20)).clamp(14, 80).round(1),
            "落地追加", {
                unit: "威力",
                description: "高举式摔回地面那一记的威力；体重与物攻决定，固定值、不随目标剩余血量变化。"
            }),
        /** 落地定身：14 + (等级−30)×0.2[0,8]；夹 10..22。 */
        holdTicks: seconds(
            F.base(14).plus(F.level().minus(30).times(0.2).clamp(0, 8)).clamp(10, 22).round(0),
            "落地定身", "高举式摔落后目标被按住多久（10～22 刻），这段时间它走不掉。"),
        /** 碎屑数：18 + 物攻偏移[−4,20] + 体重偏移[−2,12]；夹 12..48。 */
        motes: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.28).clamp(-4, 20))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-2, 12)).clamp(12, 48).round(0),
            "碎屑数", {
                unit: "点",
                description: "掌口合拢与落地时崩出的石屑数量，驱动画面密度；物攻越高、身体越沉崩得越多。"
            }),
        /** 起手：11 − (速度−55)×0.03[−2,3]；高举 +4；夹 7..18。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("hoist", text("worldcombat.skill.crushgrip.preference.hoist")), F.const(4), F.const(0)))
                .clamp(7, 18).round(0),
            "起手", "两掌从浮出到合拢的时间；速度越快越短，高举式要多起一势。"),
        /** 收招：9 − (速度−55)×0.02[−1.5,2]；高举 +4；夹 6..15。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("hoist", text("worldcombat.skill.crushgrip.preference.hoist")), F.const(4), F.const(0)))
                .clamp(6, 15).round(0),
            "收招", "捏完收回手掌的时间；速度快的个体更利落，高举式多一拍。"),
        /** 冷却：30 − (等级−30)×0.12[0,5]；高举 +8；夹 20..45。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(30).times(0.12).clamp(0, 5))
                .plus(F.when(F.pref("hoist", text("worldcombat.skill.crushgrip.preference.hoist")), F.const(8), F.const(0)))
                .clamp(20, 45).round(0),
            "冷却", "再捏一记前的等待；等级越高回得越快，高举式更费。")
    });

    defineDamage(crushgripId, "grip", {},
        // 每个目标各自结算：命中时用该目标自己的血量重算捏合威力，完整度系数落到**这个人**身上。
        {
            contact: true,
            resolve: function (damage: PokemonDamage.FeatureContext) {
                return damage.facts ? { power: actionParameters.rules.formulaValue(crushgripId + "/grip", damage.facts) } : undefined;
            }
        });
    defineDamage(crushgripId, "slam", {}, { contact: true });

    stages(crushgripId, [
        { level: 30, values: { grip: 104 } },
        { level: 50, values: { grip: 124, gripRadius: 0.95 } }
    ]);

    describe(crushgripId, [
        { key: "description.0", values: ["grip"] },
        { key: "description.1", values: ["reach"] },
        { key: "hoist.on", values: ["lift", "hold", "drop", "slam", "holdTicks"], when: function (context) { return read(context.detail.values, ["hoist"]) === true; } },
        { key: "hoist.off", values: [], when: function (context) { return read(context.detail.values, ["hoist"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grip"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.grip"] }
    ]);
}
