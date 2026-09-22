/**
 * 神鸟猛击 / skyattack 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 18）之内。这一招是远距离的上空重击，
 *   射程来自 `altitude`，所以愿意从比近战远得多的地方起飞；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferAirborne`（默认开）打开时，飞在空中（未着地）的目标排得更前——落点正对它头上，
 *   地面单位还可能在蓄势那一拍里走开；关闭则所有目标同价。
 * 够不到怎么办：够不到就交给共享接近逻辑先走近到 `reach`。
 * 放完之后：蓄势那一拍是公开的破绽，放完交回共享交战计划决定追击还是脱离；不反伤，没有额外负担。
 */
namespace PokemonSkills {
    function skyattackWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
    }

    CompanionBehavior.registerUse("skyattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skyattackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !skyattackWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferAirborne", true) && target.grounded === false) score += 12;
            return score;
        }
    });

    addPreferences("skyattack", {}, [
        field(pathOf("highDive"), "高空式", "boolean", {
            help: "开启：蓄势高度 ×1.3、坠落威力 ×1.12、畏缩更久，但蓄势 +6 刻、冷却 +12 刻——用更长的破绽换更重的一击。关闭（低空式）：更快起手、更安全，高度与威力收一档。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 28, step: 1,
            help: "对手离自己这么远以内才考虑起飞砸下；调小只打近处，调大愿意从更远处先手。"
        }),
        field(pathOf("ai.preferAirborne"), "优先打空中的", "boolean", {
            help: "开启：飞在空中的目标排得更前——落点正对它头上，它更难在这一拍里走开；关闭则所有目标同价。"
        })
    ]);
}
