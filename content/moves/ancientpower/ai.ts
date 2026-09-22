/**
 * 原始之力 / ancientpower —— 伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、连空中一起罩的近距扫场。它是靠反哺长期受益、又需要有人站在圈里的一招，
 *   所以 `ready` 要求身周 `ai.maxChase`（默认 7）格内至少站着 `ai.minFoes`（默认 1）个可见、敌对的敌人——
 *   一个也行，凭反哺把能力叠起来；调 2 以上则只在被围住时才轰。
 * `available` 还要求目标在考虑距离内；它不挑目标站不站在地上（古力半球连空中的也罩）。
 * 够不到交给共享接近逻辑；走到冲击半径以内就原地轰开。
 */
namespace PokemonSkills {
    function ancientpowerCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 7);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function ancientpowerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("ancientpower", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && ancientpowerCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return ancientpowerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !ancientpowerWants(context, capability, target)) return 0;
            let base = 16;
            const count = ancientpowerCount(context, capability);
            if (count >= 2) base += Math.min(22, (count - 1) * 7);
            return base;
        }
    });

    addPreferences("ancientpower", {}, [
        field(pathOf("deep"), "深源式", "boolean", {
            help: "开启：冲击半径约 ×0.82、威力约 ×1.12、反哺概率 +0.05，但起手与冷却更长，适合收进一小圈砸硬目标、也更想靠反哺叠能力。关闭（广域式，默认）：覆盖约 ×1.15、外推更远、出手更快，适合一次罩一小片。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑原始之力；调小只在贴身时轰，调大愿意先接近再轰。"
        }),
        field(pathOf("ai.minFoes"), "圈内人数", "number", {
            min: 1, max: 6, step: 1,
            help: "冲击半径内至少站着这么多可见、敌对的敌人才出手；调 1 见一个就轰（靠反哺长期受益），调大只在被围住时用。"
        })
    ]);
}
