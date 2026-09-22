/** 花疗：立即治疗选定友方；青草场地加成读取目标状态，撒花与绽放承载反馈。 个体差异、配置和现场事实由以下公式定义。 */
namespace PokemonSkills {
    export const floralhealingId = "floralhealing";

    function floralhealingTarget(context: FactContext): CombatActor | null {
        if (context.target && context.target.actor) return context.target.actor;
        if (context.action) { var found = context.action.target(); if (found) return found; }
        return null;
    }

    /** 目标身上是否带着青草场地的身份。 */
    function floralhealingGrass(context: FactContext): number {
        var target = floralhealingTarget(context);
        if (!target || !context.world || !context.world.valid(target)) return 0;
        return CombatStatus.has(context.world, target, "grassyterrain") ? 1 : 0;
    }

    defineFacts(floralhealingId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "grass") return Formula.fact(floralhealingGrass(context));
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "grass") return undefined;
                return { value: floralhealingGrass(context), label: { key: "worldcombat.skill." + floralhealingId + ".value.grass" }, terms: [] };
            }
        };
    });

    actionParameters.define(floralhealingId, {
        heal: percent(F.base(0.50)
            .plus(F.individual("friendship").minus(70).times(0.0006).clamp(-0.05, 0.10).as("花意"))
            .plus(F.var("grass", { key: "worldcombat.skill." + floralhealingId + ".value.grass" }).times(0.167))
            .times(F.when(F.pref("bouquet"), F.const(1.06), F.const(1)))
            .clamp(0.40, 0.70).round(3),
            "回复比例", "伙伴回复其最大生命的这个比例；亲密度越高花越滋养，站在青草场地上回复提高到约 2/3。"),
        reach: formula(F.base(5)
            .plus(F.level().minus(20).max(0).times(0.07).clamp(0, 2))
            .times(F.when(F.pref("bouquet"), F.const(0.9), F.const(1)))
            .clamp(4, 9).round(2),
            "施放距离", { unit: " 格", description: "花瓣最远送到哪里；等级越高越远，繁花档略近。" }),
        petals: formula(F.base(18).plus(F.body("height").minus(1.4).max(0).times(12))
            .times(F.when(F.pref("bouquet"), F.const(1.4), F.const(1)))
            .clamp(14, 64).round(),
            "花瓣数量", { unit: " 点", description: "撒出与绽开的花瓣数量；身量越大越多，繁花档 ×1.4，直接驱动粒子。" }),
        bloomRadius: formula(F.base(0.8).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(0, 0.5))
            .times(F.when(F.pref("bouquet"), F.const(1.25), F.const(1)))
            .clamp(0.6, 1.9).round(2),
            "绽开半径", { unit: " 格", description: "花朵在伙伴脚下绽开的半径；特攻越高越大，繁花档 ×1.25。" }),
        flowers: formula(F.base(3).plus(F.level().minus(20).max(0).times(0.06))
            .times(F.when(F.pref("bouquet"), F.const(1.5), F.const(1)))
            .clamp(2, 8).round(),
            "落花数量", { unit: " 朵", description: "治疗后飘落的花朵粒子数量；等级越高、繁花档越多。" }),
        tempo: seconds(F.base(9).minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 3)).clamp(5, 14),
            "起手", "把花瓣拢起来撒出去之前的准备；速度越快起得越利落。"),
        settle: seconds(F.base(8).plus(F.body("height").minus(1.4).times(0.4).clamp(-1, 2)).clamp(5, 13),
            "收招", "撒完花瓣之后收势的时间；身板越大收得稍慢。")
    });

    stages(floralhealingId, [
        { level: 40, values: { cooldown: 112 } },
        { level: 60, values: { cooldown: 94 } }
    ]);

    describe(floralhealingId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["reach", "petals", "bloomRadius"] },
        { key: "description.2", values: ["flowers", "tempo", "settle"] },
        { key: "stance.bouquet", values: [], when: function (context) { return read(context.detail.values, ["bouquet"]) === true; } },
        { key: "stance.plain", values: [], when: function (context) { return read(context.detail.values, ["bouquet"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
