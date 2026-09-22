/**
 * 花疗 / Floral Healing —— 参数与数值来源。
 *
 * 原生事实：Fairy／变化／威力 —／命中 —／PP 10／target normal；回复目标最大 HP 的一半，青草场地上改为 2/3。
 * 世界化：把「花疗」当成撒一路花瓣、在伤者脚下真的开一朵花——回复当场兑现，之后地上留下几朵短命的花
 *   （`world.terrain` 租借、`linger`，到期原方块回来）。青草场地的加成读的是**目标**身上是否带着共享身份
 *   `world_combat:status/grassyterrain`（青草场地场地给站在草上的活体挂的身份），也就是「伤者脚下有没有草」。
 *   只送给别人（原生 target normal 不含自己）：自己受伤请用羽栖／集沙／睡觉。
 * 与同族分开：治愈波动是一圈赶路、会被身体挡下的波；花疗是花瓣当场在伤者身上绽开、并在地面留下花，吃青草场地。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal         回复比例：0.50 + 亲密度偏移[−0.05,0.10] + 青草场地[0,0.167]，繁花档 ×1.06，夹 0.40..0.70。
 *   reach        施放距离：5 + 等级(≥20)偏移[0,2]，繁花档 ×0.9，夹 4..9 格。
 *   petals       花瓣数量：18 + 身高(≥1.4)偏移[0,12]，繁花档 ×1.4，夹 14..64 点，直接驱动粒子。
 *   bloomRadius  绽开半径：0.8 + 特攻偏移[0,0.5]，繁花档 ×1.25，夹 0.6..1.9 格。
 *   flowers      落花数量：3 + 等级(≥20)偏移[0,2.4]，繁花档 ×1.5，夹 2..8 朵。
 *   tempo        起手：9 刻 − 速度偏移[−2,3]，夹 5..14。
 *   settle       收招：8 刻 + 身高偏移[−1,2]，夹 5..13。
 * 配置 bouquet（繁花）：花瓣、落花与绽开半径更大、回复略高，代价是射程 ×0.9、冷却更久；
 *   关闭（省花）够得更远、冷却更短，花瓣与落花更少。
 */
namespace PokemonSkills {
    export const floralhealingId = "floralhealing";

    function floralhealingTarget(context: FactContext): CombatActor | null {
        if (context.target && context.target.actor) return context.target.actor;
        if (context.action) { var found = context.action.target(); if (found) return found; }
        return null;
    }

    /** 目标身上是否带着青草场地的身份（即它脚下有没有草）。 */
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
            "落花数量", { unit: " 朵", description: "在伙伴脚下真的种下几朵花；等级越高、繁花档越多。" }),
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
