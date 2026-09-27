/**
 * 电击波 / shockwave 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.preferWet`（默认开）：目标湿身或**目标当地正在下雨**时抬高 priority，因为电沿水传导更狠。
 * 属性相性：电属性对地面属性免疫，目标已知属性免疫时不出手（其他模组的普通生物类型未知，按普通远程分）。
 * 可达性：自身到目标要有真实通视线，被墙挡住时电流会在墙面截住，不该为隔墙目标先手。
 * 便宜、快、射程中等，所以它不是最后的近身选择，而是先手消耗与收尾手段。
 */
namespace PokemonSkills {
    /** 目标当前是否导电更强：身上湿，或目标当地在下雨。 */
    function shockwaveWet(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.wet) return true;
        const env = WorldEnvironment.read(CompanionBehavior.world(context), CompanionBehavior.point(target.point));
        return !!env && typeof env.rain === "number" && env.rain > 0.2;
    }

    /** 电属性对目标已知属性的相性倍率；-1 表示目标类型未知（按普通远程对待）。 */
    function shockwaveCoverage(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        if (!facts || !Array.isArray(facts.types) || !facts.types.length) return -1;
        let factor = 1;
        for (let index = 0; index < facts.types.length; index++)
            factor *= CobblemonCombat.typeEffectiveness("electric", facts.types[index]);
        return factor;
    }

    /** 自身到目标是否有通视射线；被地形挡住时电流会先撞墙。 */
    function shockwaveReachable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("shockwave", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (!shockwaveReachable(context, target)) return 0;
            const coverage = shockwaveCoverage(context, target);
            if (coverage === 0) return 0;
            let score = 18;
            if (CompanionBehavior.ai<boolean>(capability, "preferWet", true) && shockwaveWet(context, target)) score += 16;
            if (coverage > 1) score += 6;
            return score;
        }
    });

    addPreferences("shockwave", {}, [
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动放电，先走近。越大越会在更远处先手点电。"
        }),
        field(pathOf("ai.preferWet"), "优先湿处", "boolean", {
            help: "开启后，湿身或所在处正在下雨的目标会被优先放电，因为电沿水传导更狠；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时放电。"
        })
    ]);
}
