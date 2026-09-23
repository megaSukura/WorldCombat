/**
 * 波导弹 / aurasphere —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：格斗／特殊／威力 80／命中必定（accuracy true）／PP 20／目标 any／
 *   非接触、pulse+bullet／无次要效果。描述是「从体内产生出波导之力，然后向对手发出。攻击必定会命中。」
 *
 * 翻译：把「必定命中」落成一颗**会自己拐弯的波导球**——球在飞出去后一路朝目标修正方向，你跑它拐，
 *   所以甩不掉；这就是必中在场上看得见的样子。它是本组射程最远、最稳的一发：单颗、密度高、飞得远。
 *   与魔法叶／高速星星分开：那些是散成一群的小东西，各追各的；波导弹只有一颗，全能量压在一个目标上。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   pulse       波导威力：特攻定球的密度，等级补熟练；远追把能量分给制导，单发略轻。
 *   reach       射程：等级与特攻决定能打多远。
 *   velocity    球速：速度决定飞得多急。
 *   turn        追踪转向：速度决定拐得多急，追得多死（必中的直接来源）。
 *   lockRange   锁定距离：特攻与等级决定球能咬住多远的目标。
 *   radius      判定半径：体型高度决定球多粗。
 *   motes       波导光点：特攻与等级派生，驱动画面密度。
 *   tempo/aftercast/recharge 速度决定节奏；远追多蓄一会儿。
 *
 * 配置 `seek`（远追）双向取舍：开启＝射程 ×1.18、转向 ×1.3（更远也追得更死），但威力 ×0.92、球速 ×0.9、
 *   起手 +2 刻、冷却 +5 刻；关闭（撞波）＝球更粗更快更重、射程更近。一个换「多远都咬得住」，一个换「贴上来一炮打穿」。
 *
 * 伤害段 `pulse`：命中那一下随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export const aurasphereId = "aurasphere";
    export const aurasphereScene = "world_combat:move_aurasphere";
    export const aurasphereMissText = "world_combat.move.aurasphere.text.miss";

    actionParameters.define(aurasphereId, {
        /** 波导威力：78 + 特攻偏移[−12,30] + 等级(≥25)偏移[0,9]，远追 ×0.92、撞波 ×1.12；夹 56..128。 */
        pulse: formula(
            F.base(78, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.26).clamp(-12, 30).as("特攻"))
                .plus(F.level().minus(25).times(0.35).clamp(0, 9).as("等级"))
                .times(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(0.92), F.const(1.12)).as("导法"))
                .clamp(56, 128).round(1),
            "波导威力", {
                unit: "威力",
                description: "球命中那一下的基础威力；特攻越高球越密，等级让波导更凝。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：16 + 等级(≥25)偏移[0,2.5] + 特攻偏移[−0.9,2.4]，远追 ×1.18；夹 12..22。 */
        reach: formula(
            F.base(16, "基础")
                .plus(F.level().minus(25).times(0.08).clamp(0, 2.5).as("等级"))
                .plus(F.stat("specialAttack").minus(55).times(0.03).clamp(-0.9, 2.4).as("特攻"))
                .times(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(1.18), F.const(1)).as("导法"))
                .clamp(12, 22).round(2),
            "射程", {
                unit: "格",
                description: "波导球能打到多远；等级高、特攻高的个体扔得更远。它也是本招的实际射程。"
            }),
        /** 球速：2.0 + 速度偏移[−0.25,0.5]，远追 ×0.9；夹 1.5..3.0。 */
        velocity: formula(
            F.base(2.0, "基础")
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.25, 0.5).as("速度"))
                .times(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(0.9), F.const(1)).as("导法"))
                .clamp(1.5, 3.0).round(2),
            "球速", {
                unit: "格/刻",
                description: "球飞行的速度；速度快的个体扔得更急，目标更难提前走位。远追为了修正方向飞得慢一点。"
            }),
        /** 追踪转向：13 + 速度偏移[−2.5,4.5]，远追 ×1.3；夹 9..24。 */
        turn: formula(
            F.base(13, "基础")
                .plus(F.stat("speed").minus(55).times(0.07).clamp(-2.5, 4.5).as("速度"))
                .times(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(1.3), F.const(1)).as("导法"))
                .clamp(9, 24).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "球每刻朝目标转向的最大角度；转弯够急就甩不掉，这是「必定命中」的直接来源。"
            }),
        /** 锁定距离：20 + 特攻偏移[−2,4] + 等级(≥25)偏移[0,3]；夹 16..28。 */
        lockRange: formula(
            F.base(20, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.06).clamp(-2, 4).as("特攻"))
                .plus(F.level().minus(25).times(0.1).clamp(0, 3).as("等级"))
                .clamp(16, 28).round(1),
            "锁定距离", {
                unit: "格",
                description: "波导球能一路咬住目标的最远距离；比射程更远，所以目标在球射出后继续跑也甩不掉。"
            }),
        /** 判定半径：0.32 + 体型高度偏移[−0.05,0.18]，撞波 ×1.15；夹 0.26..0.6。 */
        radius: formula(
            F.base(0.32, "基础")
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.05, 0.18).as("体型"))
                .times(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(1), F.const(1.15)).as("导法"))
                .clamp(0.26, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "球体的判定粗细；大个子逼出的球更粗。撞波把球压得更实。"
            }),
        /** 波导光点：18 + 特攻偏移[0,22] + 等级(≥25)偏移[0,10]；夹 14..54。 */
        motes: formula(
            F.base(18, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.22).clamp(0, 22).as("特攻"))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10).as("等级"))
                .clamp(14, 54).round(0),
            "波导光点", {
                unit: "点",
                description: "球体表面与尾迹上的波导光点数量，随特攻与等级增长；粒子按它发射。"
            }),
        /** 起手：10 − 速度偏移[−2,3]，远追 +2；夹 6..16。 */
        tempo: seconds(
            F.base(10, "基础")
                .minus(F.stat("speed").minus(55).times(0.035).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(2), F.const(0)).as("导法"))
                .clamp(6, 16).round(0),
            "起手", "把波导从体内逼出、凝成一颗球需要多久；速度越快起得越短，远追要多蓄一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        aftercast: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2).as("速度")).clamp(5, 12).round(0),
            "收招", "球出手后的收势；快的个体收得干脆。"),
        /** 冷却：30 − 速度偏移[−4,6]，远追 +5；夹 20..46。 */
        recharge: seconds(
            F.base(30, "基础")
                .minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6).as("速度"))
                .plus(F.when(F.pref("seek", text("worldcombat.skill.aurasphere.preference.seek")), F.const(5), F.const(0)).as("导法"))
                .clamp(20, 46).round(0),
            "冷却", "两次发球之间的等待；速度越快回得越快，远追蓄得更久。PP 20 的代价。")
    });

    defineDamage(aurasphereId, "pulse", {}, { pulse: true });

    stages(aurasphereId, [
        { level: 33, values: { pulse: 88, reach: 17 } },
        { level: 50, values: { pulse: 98, turn: 18, motes: 26 } }
    ]);

    describe(aurasphereId, [
        { key: "description.0", values: ["pulse"] },
        { key: "description.1", values: ["reach", "velocity", "turn"] },
        { key: "description.2", values: ["lockRange"] },
        { key: "seek.on", values: [], when: function (context) { return read(context.detail.values, ["seek"]) === true; } },
        { key: "seek.off", values: [], when: function (context) { return read(context.detail.values, ["seek"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pulse", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pulse", "tier.1.turn"] }
    ]);
}
