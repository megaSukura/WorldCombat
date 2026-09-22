/**
 * 同步干扰 / synchronoise 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、**只打与自己属性相同的目标**的扫场。整招的开关就是属性比对：
 * `selectTarget`／`accepts`／`available` 都要求目标是与施法者同属性的宝可梦（原版生物没有属性、
 * 永不同频，也不会被选中）；`ready` 要求身周 `ai.maxChase`（默认 9）格内至少站着 `ai.minMatches`
 * （默认 1）个可见、敌对、同属性的目标，否则整招不参与选择——圈里没有同频的人时它只会白扫。
 * 同频的人越多 priority 越高。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function synchronoiseTypes(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string[] | null {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return facts ? facts.types : null;
    }

    /** 两组属性是否有交集。 */
    function synchronoiseOverlap(caster: string[], target: string[]): boolean {
        for (let i = 0; i < caster.length; i++) if (target.indexOf(caster[i]) >= 0) return true;
        return false;
    }

    function synchronoiseSelfTypes(context: WorldBehavior.Context): string[] | null {
        return synchronoiseTypes(context, CompanionBehavior.source(context));
    }

    function synchronoiseMatches(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const caster = synchronoiseSelfTypes(context);
        if (!caster || !caster.length) return 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 9);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const types = synchronoiseTypes(context, other);
            if (!types || !synchronoiseOverlap(caster, types)) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function synchronoiseShares(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const caster = synchronoiseSelfTypes(context), types = synchronoiseTypes(context, target);
        return !!caster && !!types && caster.length > 0 && synchronoiseOverlap(caster, types);
    }

    function synchronoiseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (!synchronoiseShares(context, target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("synchronoise", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && synchronoiseMatches(context, capability) >= CompanionBehavior.ai<number>(capability, "minMatches", 1);
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
            help: "伙伴只在同频目标离自己这么远以内时才考虑同步干扰；调小只在贴身播，调大愿意先追进去。"
        }),
        field(pathOf("ai.minMatches"), "同频人数", "number", {
            min: 1, max: 6, step: 1,
            help: "身周这么远内至少要站着这么多可见、敌对、同属性的目标才播；调大只在同频的人扎堆时用，调 1 见一个同频的就打。"
        })
    ]);
}
