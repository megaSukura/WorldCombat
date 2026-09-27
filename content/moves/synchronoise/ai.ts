/** 伙伴使用本招的频率读取器挑选同频敌人，执行与AI使用相同的资格；计数按招式真实的电波半径与高度带。 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:synchronoise_frequency", function (world, actor) { return synchronoiseFrequencies(world, actor); });
    function synchronoiseTypes(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string[] | null {
        return CompanionBehavior.fact<string[]>(context, "world_combat:synchronoise_frequency", target) || null;
    }

    /** 两组属性是否有交集。 */
    function synchronoiseOverlap(caster: string[], target: string[]): boolean {
        for (let i = 0; i < caster.length; i++) if (target.indexOf(caster[i]) >= 0) return true;
        return false;
    }

    function synchronoiseSelfTypes(context: WorldBehavior.Context): string[] | null {
        return synchronoiseTypes(context, CompanionBehavior.source(context));
    }

    /** 本招在本次决策里的真实电波半径：复用参数公式（收束配置、等级与体型），同一决策内缓存一次。 */
    function synchronoiseWaveRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const key = "world_combat:synchronoise_wave_radius";
        const cached = context.scratch[key];
        if (typeof cached === "number") return cached;
        const world = CompanionBehavior.world(context);
        const value = Math.max(3.2, PokemonSkills.p("synchronoise", "waveRadius", {
            world: world, actor: world.source(), skill: PokemonSkills.skills["synchronoise"],
            detail: { values: item.data.config || {} }
        }));
        context.scratch[key] = value;
        return value;
    }

    /** 真实电波半径与高度带内、可见且存活的目标；收束半径变小后，圈外的同频者不再被算进来。 */
    function synchronoiseInside(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (Math.abs(target.point[1] - self.point[1]) > 3) return false;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        return Math.sqrt(dx * dx + dz * dz) <= synchronoiseWaveRadius(context, item);
    }

    function synchronoiseShares(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const caster = synchronoiseSelfTypes(context), types = synchronoiseTypes(context, target);
        return !!caster && !!types && caster.length > 0 && synchronoiseOverlap(caster, types);
    }

    /** 真实声场里的同频人数，用来决定是否值得播以及播出来多值。 */
    function synchronoiseMatches(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!synchronoiseShares(context, other)) continue;
            if (!synchronoiseInside(context, item, other)) continue;
            count++;
        }
        return count;
    }

    /** 考虑距离：只在目标离自己 ai.maxChase 以内时才愿意播；真的电波覆盖由 synchronoiseInside 决定。 */
    function synchronoiseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (!synchronoiseShares(context, target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("synchronoise", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return synchronoiseWaveRadius(context, capability); },
        ready: function (context, capability) {
            return capability.data.ready !== false
                && synchronoiseMatches(context, capability) >= CompanionBehavior.ai<number>(capability, "minMatches", 1);
        },
        selectTarget: function (context, capability, proposed) {
            return synchronoiseShares(context, proposed) ? proposed : null;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return synchronoiseWants(context, capability, target);
        },
        accepts: function (context, capability, target) { return synchronoiseShares(context, target); },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !synchronoiseWants(context, capability, target)) return 0;
            const matches = synchronoiseMatches(context, capability);
            return 22 + Math.min(24, (matches - 1) * 10);
        }
    });

    addPreferences("synchronoise", {}, [
        field(pathOf("tight"), "收束同调", "boolean", {
            help: "开启：电波收到约 0.62 倍、共振威力约 ×1.42、同频记号更久，起手 +2 刻、冷却 +6 刻，用来把单个同频目标打穿。关闭（宽播同调）：电波约 ×1.0、威力不变，用来在一片混战里尽量扫到同频的人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在同频目标离自己这么远以内时才考虑同步干扰；真的电波半径仍按该个体公式取值，这个值只放宽/收紧它愿意先追进去的距离。"
        }),
        field(pathOf("ai.minMatches"), "同频人数", "number", {
            min: 1, max: 6, step: 1,
            help: "实际电波半径与高度带内至少要站着这么多可见、敌对、同频的目标才播；调大只在同频的人扎堆时用，调 1 见一个同频的就打。"
        })
    ]);
}
