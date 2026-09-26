/**
 * 原始之力 / ancientpower —— 伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、连空中一起罩的近距扫场。它是刷新短时反哺、又需要有人站在圈里的一招。
 *   计数只算**真正落在实际冲击圈内**的敌人——横向不超过本个体 resolve 出的冲击半径，纵向在实际上下作用高度内，
 *   且到中心视线可达（墙后的目标不算被波及）。`ai.minFoes` 调大时只认圈内人数；默认 1 时允许先接近到射程内，
 *   真正施放前共享任务会复核圈内人数，所以圈外或隔墙的目标不会让它原地空震。
 * `available` 用 `ai.maxChase`（默认 7）决定是否先接近；它不挑目标站不站在地上（古力半球连空中的也罩）。
 * 够不到交给共享接近逻辑；走到冲击半径以内、圈内人数达标就原地轰开。
 */
namespace PokemonSkills {
    /** 只数实际能波及的敌人：真实半径、真实上下高度、真实视线。 */
    function ancientpowerCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const limit = typeof item.data.range === "number" ? item.data.range : 3.4;
        const band = Math.max(1.1, p("ancientpower", "band", world));
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self.point[0], dy = other.point[1] - self.point[1], dz = other.point[2] - self.point[2];
            if (Math.sqrt(dx * dx + dz * dz) > limit || Math.abs(dy) > band) continue;
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    function ancientpowerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    /** 考虑距离内是否还有可用敌人：让它先走近再轰，而不是一开始就因为圈里没人被排除。 */
    function ancientpowerApproachable(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            if (ancientpowerWants(context, item, nearby[i])) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("ancientpower", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false) return false;
            const minimum = CompanionBehavior.ai<number>(capability, "minFoes", 1);
            if (ancientpowerCount(context, capability) >= minimum) return true;
            // 默认只要一个敌人时，允许先接近到射程内；真正施放前共享任务会复核圈内人数，隔墙达标不了不会空震。
            return minimum <= 1 && ancientpowerApproachable(context, capability);
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
            help: "开启：冲击半径约 ×0.82、威力约 ×1.12、反哺概率 +0.05，但起手与冷却更长，适合收进一小圈砸硬目标、也更想刷新短时反哺。关闭（广域式，默认）：覆盖约 ×1.15、外推更远、出手更快，适合一次罩一小片。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑原始之力；调小只在贴身时轰，调大愿意先接近再轰。"
        }),
        field(pathOf("ai.minFoes"), "圈内人数", "number", {
            min: 1, max: 6, step: 1,
            help: "实际冲击圈内至少站着这么多可见、敌对、视线可达的敌人才出手；圈外或隔墙的目标不算。调 1 见一个就轰（刷新短时反哺），调大只在被围住时用。"
        })
    ]);
}
