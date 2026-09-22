/**
 * 抓 / scratch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 4）格内；抓的射程最短，更远先交给共享接近逻辑。
 * 对谁出手：`ai.huntBig`（默认开）把体型宽的对手排得更前——一爪能同时抓中更多道痕；残血目标再加一档收尾。
 * 够不到怎么办：这是全族最便宜的招，够不到就先贴近，不急着换别的。
 * 放完之后：目标掉一层血，交回共享顺序决定继续贴脸还是等冷却；它是持续压制时最顺的一记。
 */
namespace PokemonSkills {
    function scratchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
    }

    CompanionBehavior.registerUse("scratch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return scratchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !scratchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "huntBig", true) && (target.width || 0.9) >= 1.2) score += 8;
            if (CompanionBehavior.ratio(target) < 0.4) score += 6;
            return score;
        }
    });

    addPreferences("scratch", {}, [
        field(pathOf("sweep"), "宽搔式", "boolean", {
            help: "开启：爪痕道数 +2、张角放宽，一爪扫到并排或大体型的对手，代价是每道威力 ×0.86、探距更近、起手与冷却更久。关闭（直搔式）：痕少而长、每道更重、出手更快，适合点杀小目标。"
        }),
        number("ai.maxChase", "出手距离", 2, 10, 1),
        flag("ai.huntBig", "优先大体型")
    ]);
}
