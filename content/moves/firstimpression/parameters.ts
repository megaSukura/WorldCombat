/** 首动全身扑砸；本场资格与原生普通攻击共享，真正脱战后恢复。 */
namespace PokemonSkills {
    export const firstimpressionId = "firstimpression";
    export const firstimpressionScene = "world_combat:move_firstimpression";

    /** The first committed action of an actual encounter, shared with ordinary native attacks. */
    export function firstimpressionFresh(world: CombatWorld, actor: CombatActor): boolean {
        return CombatEncounters.first(world, actor);
    }
    CombatEncounters.views.define({
        id: "world_combat:firstimpression/opening",
        apply: view => CombatEncounters.cue(view, "firstimpression:opening", firstimpressionScene,
            view.first && NativeLoadout.hasEquipped(view.world, view.actor, firstimpressionId))
    });

    actionParameters.define(firstimpressionId, {
        /** 扑砸威力：90 +（物攻 − 60）× 0.34 [−16,42] +（等级 − 30）× 0.4 [−4,12]；舍身 ×1.12；夹 60..175。 */
        slam: formula(
            F.base(90)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-16, 42))
                .plus(F.level().minus(30).times(0.4).clamp(-4, 12))
                .times(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(1.12), F.const(1)))
                .clamp(60, 175).round(1),
            "扑砸威力", {
                unit: "威力",
                description: "整段扑出去撞上的这一下威力；物攻给份量、等级给底气。舍身式再重一成二。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑出距离：3.0 +（速度 − 55）× 0.022 [−0.5,1.5] +（等级 − 30）× 0.02 [0,0.8]；舍身 ×1.08；夹 2.6..5.6。 */
        leap: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.022).clamp(-0.5, 1.5))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.8))
                .times(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(1.08), F.const(1)))
                .clamp(2.6, 5.6).round(2),
            "扑出距离", {
                unit: "格",
                description: "从弓身到撞上目标的最大扑出距离，也是本招的实际射程来源；腿快的个体从更远处就能起跳。"
            }),
        /** 每刻位移：0.95 +（速度 − 55）× 0.006 [−0.15,0.45]；夹 0.7..1.6。 */
        speed: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.45)).clamp(0.7, 1.6).round(2),
            "扑砸速度", { unit: "格/刻", description: "扑出去每刻移动的距离；越快越难在半空被让开。" }),
        /** 判定半径：0.44 +（身高 − 1.4）× 0.1 [−0.08,0.28]；夹 0.36..0.78。 */
        collisionRadius: formula(
            F.base(0.44).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.28)).clamp(0.36, 0.78).round(2),
            "判定半径", { unit: "格", description: "扑砸途中扫过活体的判定半径；身板越大扫得越宽，越难被侧身躲开。" }),
        /** 顶开距离：0.45 +（物攻 − 60）× 0.004 [−0.1,0.4] +（体重 − 50）× 0.003 [−0.08,0.5]；舍身 ×1.25；夹 0.2..1.4。 */
        push: formula(
            F.base(0.45).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.4))
                .plus(F.body("weight").minus(50).times(0.003).clamp(-0.08, 0.5))
                .times(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(1.25), F.const(1)))
                .clamp(0.2, 1.4).round(2),
            "顶开距离", { unit: "格", description: "撞实后把目标沿冲势顶开多远；物攻越高、体重越沉顶得越远，舍身式再远四分之一。" }),
        /** 起手：5 −（速度 − 55）× 0.02 [−1,2] + 舍身 3；夹 3..11 刻。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(3), F.const(0)))
                .clamp(3, 11).round(0),
            "起手", "从弓身蓄势到扑出去之间的时间；速度快的个体起得更急，舍身式要先沉住一口气。"),
        /** 收招：8 + 舍身 4 −（速度 − 55）× 0.02 [−1,2]；夹 5..14 刻。 */
        settle: seconds(
            F.base(8).plus(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(4), F.const(0)))
                .minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 14).round(0),
            "收招", "撞完落地站起的时间；舍身式冲得太猛，爬起来更慢，这段时间容易被反打。"),
        /** 冷却：36 −（速度 − 55）× 0.12 [−4,6] + 舍身 8；夹 24..52 刻。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("reckless", text("worldcombat.skill.firstimpression.preference.reckless")), F.const(8), F.const(0)))
                .clamp(24, 52).round(0),
            "冷却", "这一记之后多久能再全力扑一次；本招真正的一次性来自「刚出场」，冷却只是别让人连着砸。"),
        minimumMove: hidden(0.05)
    });

    defineDamage(firstimpressionId, "slam", { defenceCoefficient: 0.005,
        rationale: "整段身体扑砸的重击；出手机会只有一次，份量给足。" }, { contact: true });

    stages(firstimpressionId, [
        { level: 30, values: { slam: 100 } },
        { level: 50, values: { slam: 122, leap: 3.8 } }
    ]);

    describe(firstimpressionId, [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["leap","speed","collisionRadius","push"] },
        { key: "description.2", values: [] },
        { key: "reckless.on", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range","tempo","settle","pp","recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.leap"] }
    ]);

}
