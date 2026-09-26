/** 本场真实友方死亡增重；自由瞄准送出一列独立行进的鬼影。 */
namespace PokemonSkills {
    export const lastrespectsId = "lastrespects";
    export const lastrespectsScene = "world_combat:move_lastrespects";
    export const lastrespectsStrikeText = "world_combat.move.lastrespects.text.strike";
    export const lastrespectsMarchText = "world_combat.move.lastrespects.text.march";
    export const lastrespectsMissText = "world_combat.move.lastrespects.text.miss";
    export function lastrespectsCount(world: CombatWorld, actor: CombatActor): number {
        return CombatEncounters.fallen(world, actor);
    }

    defineFacts(lastrespectsId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            if (id === "lastrespects.fallen") return lastrespectsCount(context.world, context.actor);
            return undefined;
        } };
    });

    actionParameters.define(lastrespectsId, {
        fallen: formula(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")), "倒下伙伴数", {
            unit: "位", description: "本场共同交战中已确认的友方死亡次数；同次死亡只记一次，复活后再倒下可再记。真正脱战后清零。"
        }),
        /** 扫墓威力：48 + 倒下伙伴 ×50（封顶 +250）+ 物攻偏移[−8,24] + 等级偏移[−2,6]；随行 ×0.85 / 送行 ×1.1；夹 46..320。 */
        mourn: formula(
            F.base(48)
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(50).clamp(0, 250).as(text("worldcombat.skill.lastrespects.value.mourned")))
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 24))
                .plus(F.level().minus(30).times(0.16).clamp(-2, 6))
                .times(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(0.85), F.const(1.1)))
                .clamp(46, 320).round(1),
            "扫墓威力", {
                unit: "威力",
                description: "这一扫的基准威力；**每有一位同阵营伙伴在本场倒下就加 50**（封顶 +250），物攻给分量、等级给底气。随行式每人 ×0.85、送行式 ×1.1。对手防御、相性与暴击在命中时另算。"
            }),
        /** 随行鬼影：2 + 倒下伙伴 ×3；夹 2..20。 */
        ghosts: formula(
            F.base(2).plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(3)).clamp(2, 20).round(0),
            "随行鬼影", {
                unit: "道",
                description: "从地里升起、随这一扫一起走的鬼影数；倒下的伙伴越多，送行的人越多，画面里的鬼影和这里的数一致。"
            }),
        /** 送葬距离：3.4 格 + 速度偏移[−0.6,1.5] + 等级偏移[0,0.6] + 倒下伙伴 ×0.08（封顶 0.6）；夹 3..6.5。 */
        reach: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.6, 1.5))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.6))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.08).clamp(0, 0.6))
                .clamp(3, 6.5).round(2),
            "送葬距离", {
                unit: "格",
                description: "鬼影队列能行进的距离；施放者送出后即可继续行动。"
            }),
        /** 行进速度：0.7 格/刻 + 速度偏移[−0.15,0.4]；夹 0.5..1.3。 */
        speed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.4)).clamp(0.5, 1.3).round(2),
            "行进速度", {
                unit: "格/刻",
                description: "送葬队列每刻前进的距离；出手快的个体走得稳而快。"
            }),
        /** 扫过宽度：0.5 格 + 体型宽度偏移[−0.08,0.28] + 倒下伙伴 ×0.03（封顶 0.3）；随行 ×1.5；夹 0.4..1.3。 */
        width: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.2).clamp(-0.08, 0.28))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.03).clamp(0, 0.3))
                .times(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(1.5), F.const(1)))
                .clamp(0.4, 1.3).round(2),
            "扫过宽度", {
                unit: "格",
                description: "这一扫沿途覆盖的半宽；身体越宽、送行的人越多，扫得越开，随行式再 ×1.5。宽度画出来，判定就是那么宽。"
            }),
        /** 顶开距离：0.35 格 + 物攻偏移[−0.08,0.3] + 倒下伙伴 ×0.03（封顶 0.3）；夹 0.2..0.9。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.3))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.03).clamp(0, 0.3))
                .clamp(0.2, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "被这一扫顶开多远；物攻越高、送行的人越多，捶得越开。"
            }),
        /** 起手：7 刻 − 速度偏移[−1,2] + 倒下伙伴 ×0.15（封顶 1.2）；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.15).clamp(0, 1.2))
                .clamp(4, 12).round(0),
            "起手", "低头默立、等伙伴的悔恨升起来的时间；送行的人越多越沉，速度快的个体起得利落。"),
        /** 收招：9 刻 − 速度偏移[−1,2]；夹 5..14。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 14).round(0),
            "收招", "扫完站定、让鬼影散去的时间。"),
        /** 冷却：26 − 速度偏移[−3,5] + 倒下伙伴 ×0.8（封顶 5）+ 随行 4；夹 16..44。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.8).clamp(0, 5))
                .plus(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(4), F.const(0)))
                .clamp(16, 44).round(0),
            "冷却", "这一次扫墓之后多久能再扫；送行的人越多、走得越远，回得越慢，随行式更费。")
    });

    defineDamage(lastrespectsId, "mourn", { defenceCoefficient: 0.0045,
        rationale: "送行的重扫从身体内部震开，对正面护甲的穿透略强于默认，让倒下伙伴数的差别更可见。" }, {});

    stages(lastrespectsId, [
        { level: 30, values: { mourn: 62, reach: 3.8 } },
        { level: 46, values: { mourn: 78, reach: 4.2, ghosts: 5 } }
    ]);

    describe(lastrespectsId, [
        { key: "description.0", values: ["mourn","fallen"] },
        { key: "description.1", values: ["reach","speed","width","push"] },
        { key: "trail.on", values: [], when: function (context) { return read(context.detail.values, ["trail"]) === true; } },
        { key: "trail.off", values: [], when: function (context) { return read(context.detail.values, ["trail"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.mourn", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.mourn", "tier.1.reach"] }
    ]);
}
