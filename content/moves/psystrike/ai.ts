/**
 * 精神击破 / psystrike —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 18）格内；够不到交给共享接近逻辑。
 *   它冷却长、代价高，是重手而非普通输出，只在值得的局面上用。
 * 对谁出手：`ai.focusThreat`（默认开）打开时，正在攻击自己或主人的目标排前——一记重压把最凶的那个砸软
 *   （顺带削它特防）正是这招最值的时候；关闭则按普通远程排序。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：目标带着下降的特防交给共享交战计划，后续特殊攻击更疼。
 */
namespace PokemonSkills {
    function psystrikeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
    }

    CompanionBehavior.registerUse(psystrikeId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psystrikeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psystrikeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 24 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "focusThreat", true)) {
                const owner = context.facts.owner;
                if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 14;
            }
            return score + Math.round(CompanionBehavior.ratio(target) * 6);
        }
    });

    addPreferences(psystrikeId, { ai: { maxChase: 18, focusThreat: true } }, [
        field(pathOf("wide"), "压场", "boolean", {
            help: "开启：落地把冲击面铺开约 2–5 格，对范围内其他非友方再结算一部分伤害并顶开，代价是主击 ×0.85、起手 +3 刻、冷却 +8 刻。关闭（点压）：只压目标一个，主击 ×1.12、更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 8, max: 26, step: 1,
            help: "超过这个距离就不主动堆重物，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.focusThreat"), "压正在出手的", "boolean", {
            help: "开启：正在攻击自己或主人的目标优先，把最凶的那个砸软；关闭则按普通远程攻击排序。"
        })
    ]);
}
