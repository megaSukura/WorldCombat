/** clearsmog：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const clearsmogId = "clearsmog";
    export const clearsmogScene = "world_combat:move_clearsmog";
    export const clearsmogVeil = "world_combat:clear_smog_veil";
    export const clearsmogMark = "world_combat:clear_smog";
    export const clearsmogClearedText = "world_combat.move.clearsmog.text.cleared";
    export const clearsmogEmptyText = "world_combat.move.clearsmog.text.empty";
    export const clearsmogMissText = "world_combat.move.clearsmog.text.miss";
    /** 会被冲回原点的能力等级项；其他活体只有五项，宝可梦还含命中与闪避。 */
    export const clearsmogStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    /** 表现里烟团半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const clearsmogReference = 2.2;

    actionParameters.define(clearsmogId, {
        /** 泥块威力：基础 34，特攻每比 50 多 1 加 0.09（夹 −5..16），速度每比 50 快 1 加 0.04（夹 −1..4）；
         *  漫烟 ×0.85；夹在 18..54。 */
        mud: formula(
            F.base(34)
                .plus(F.stat("specialAttack").minus(50).times(0.09).clamp(-5, 16))
                .plus(F.stat("speed").minus(50).times(0.04).clamp(-1, 4))
                .times(F.when(F.pref("billow", text("worldcombat.skill.clearsmog.preference.billow")), F.const(0.85), F.const(1)))
                .clamp(18, 54).round(1),
            "泥块威力", {
                unit: "威力",
                description: "泥块砸在目标身上那一下的威力；特攻越高泥越烈，速度给出甩出的劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掷出距离：基础 8 格，等级 25 起每级 +0.05（夹 −1..2），特攻每比 50 多 1 加 0.018（夹 −0.6..1.4）；夹 6..13。 */
        reach: formula(
            F.base(8)
                .plus(F.level().minus(25).times(0.05).clamp(-1, 2))
                .plus(F.stat("specialAttack").minus(50).times(0.018).clamp(-0.6, 1.4))
                .clamp(6, 13).round(1),
            "掷出距离", {
                unit: "格",
                description: "泥块能掷到多远的目标；等级与特攻越高掷得越远。它也是本招的实际射程。"
            }),
        /** 烟团半径：基础 2.0，特攻每比 50 多 1 加 0.012（夹 −0.4..1），等级 30 起每级 +0.02（夹 0..0.8）；漫烟 ×1.5；夹 1.4..4.5。 */
        cloudRadius: formula(
            F.base(2.0)
                .plus(F.stat("specialAttack").minus(50).times(0.012).clamp(-0.4, 1))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.8))
                .times(F.when(F.pref("billow", text("worldcombat.skill.clearsmog.preference.billow")), F.const(1.5), F.const(1)))
                .clamp(1.4, 4.5).round(2),
            "烟团半径", {
                unit: "格",
                description: "泥块炸开后清浊之烟能罩住多大一圈；特攻与等级越高罩得越广，漫烟式更宽。画出的烟团与它一致。"
            }),
        /** 黏烟时长：基础 50 刻 + 防御 ×0.4 + 等级 20 起每级 ×0.8（夹 0..40）；漫烟 ×1.4；夹 30..140。 */
        linger: seconds(
            F.base(50).plus(F.stat("defence").times(0.4)).plus(F.level().minus(20).times(0.8).clamp(0, 40))
                .times(F.when(F.pref("billow", text("worldcombat.skill.clearsmog.preference.billow")), F.const(1.4), F.const(1)))
                .clamp(30, 140).round(0),
            "黏烟时长", "烟黏在身上多久；这段时间里目标新加的能力等级会被反复冲散。防御与等级越高黏得越久，漫烟式更久。"),
        /** 冲散周期：基础 12 刻，速度每比 50 快 1 减 0.04（夹 −3..4）；夹在 8..16。 */
        interval: seconds(
            F.base(12).minus(F.stat("speed").minus(50).times(0.04).clamp(-3, 4)).clamp(8, 16).round(0),
            "冲散周期", "黏烟期间每隔多久把新加上的能力等级再冲回原点；速度越快冲得越勤。"),
        /** 泥块速度：基础 1.25，速度每比 50 快 1 加 0.006（夹 −0.12..0.28）；夹 1.0..1.7。 */
        flight: formula(
            F.base(1.25).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.12, 0.28)).clamp(1.0, 1.7).round(2),
            "泥块速度", {
                unit: "格/刻",
                description: "泥块飞出去的速度；速度快的个体甩得更急，对手更来不及侧身。"
            }),
        /** 泥块判定：基础 0.26 格，碰撞箱每比 1.4 高 1 加 0.07（夹 −0.03..0.14）；夹 0.16..0.48。 */
        clayRadius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.07).clamp(-0.03, 0.14)).clamp(0.16, 0.48).round(2),
            "泥块判定", {
                unit: "格",
                description: "泥块飞行与命中的横向判定；个头越高的个体甩出的泥块越大，越不容易被让开。"
            }),
        /** 烟量：基础 18，特攻每比 50 多 1 加 0.16（夹 −5..16）；夹 14..40。 */
        fumes: formula(
            F.base(18).plus(F.stat("specialAttack").minus(50).times(0.16).clamp(-5, 16)).clamp(14, 40).round(0),
            "烟量", {
                unit: "团",
                description: "烟里翻涌的浊气团数量，由特攻换算；它驱动烟团与冲散的表现密度，不是独立伤害。"
            }),
        /** 起手：基础 7 刻，速度每比 50 快 1 减 0.02（夹 −0.8..1.5）；漫烟 +1；夹在 5..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("billow", text("worldcombat.skill.clearsmog.preference.billow")), F.const(1), F.const(0)))
                .clamp(5, 11).round(0),
            "起手", "把泥团在手里捏实、甩出去前的时间；速度越快越短，漫烟式要多攒一下。"),
        /** 收招：基础 6 刻，速度每比 50 快 1 减 0.015（夹 −0.5..1）；夹在 4..9。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1)).clamp(4, 9).round(0),
            "收招", "泥块脱手后的收势；快的个体更利落。"),
        /** 冷却：基础 24 刻，速度每比 50 快 1 减 0.03（夹 −2..4）；漫烟 +8；夹在 17..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(50).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("billow", text("worldcombat.skill.clearsmog.preference.billow")), F.const(8), F.const(0)))
                .clamp(17, 38).round(0),
            "冷却", "再掷一团泥前的等待；PP 15 的手感，漫烟式更费。")
    });

    defineDamage(clearsmogId, "mud", { rationale: "特殊泥块的特殊伤害；与原生一致走特殊类别，不改变减伤规则。" }, {});

    stages(clearsmogId, [
        { level: 30, values: { mud: 42, cloudRadius: 2.4 } },
        { level: 50, values: { mud: 50, linger: 110, reach: 11 } }
    ]);

    describe(clearsmogId, [
        { key: "description.0", values: ["mud", "reach"] },
        { key: "description.1", values: ["cloudRadius", "linger", "interval"] },
        { key: "description.2", values: ["flight", "clayRadius"] },
        { key: "billow.on", values: [], when: function (context) { return read(context.detail.values, ["billow"]) === true; } },
        { key: "billow.off", values: [], when: function (context) { return read(context.detail.values, ["billow"]) !== true; } },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.mud", "tier.0.cloudRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.mud", "tier.1.linger", "tier.1.reach"] }
    ]);
}
