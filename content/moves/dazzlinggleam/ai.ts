/**
 * 魔法闪耀 / dazzlinggleam 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、空中地面一起闪的一次性整圈闪光。`ready` 要求身周 `ai.maxChase`（默认 9）格内
 * 至少站着 `ai.minFoes`（默认 2）个可见、敌对的敌人——起手极短但只闪一圈，围上来才有价值。
 * `available` 还要求目标在这个考虑距离内。
 * 对谁出手：被贴身围住时更值；自己血量偏低时再抬一档，把身边人闪花、拉开距离。
 * 够不到交给共享接近逻辑；走到半径以内就原地闪。
 */
namespace PokemonSkills {
    function dazzlinggleamCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 9);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function dazzlinggleamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("dazzlinggleam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && dazzlinggleamCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dazzlinggleamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !dazzlinggleamWants(context, capability, target)) return 0;
            let base = 20;
            const count = dazzlinggleamCount(context, capability);
            if (count >= 3) base += Math.min(22, (count - 2) * 7);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences("dazzlinggleam", {}, [
        field(pathOf("wide"), "散射式", "boolean", {
            help: "开启：光浪半径约 ×1.22、边缘更均匀、出手更慢，代价是威力约 ×0.88、目眩更短，用来一次扫到更多人。关闭（凝聚式）：威力约 ×1.14、目眩更久，半径收到约 ×0.82，用来把贴身的一两个目标闪得更狠。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑闪光；调小只在贴身闪，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "闪到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "身周这么近内至少站着这么多可见、敌对的敌人才闪；调大只被围住时用，调 1 见一个也闪。"
        })
    ]);
}
