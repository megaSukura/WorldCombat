/**
 * 火焰鞭 / firelash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格之内；更远交给共享接近逻辑。
 *   它是中距离单体的剥甲一击，靠给后续攻击开路，所以偏好在中程先手。
 * 对谁出手：`ai.strip`（默认开）打开时，防御还没被剥到底的目标多一档分——把这次投资花在收益还大的目标上；
 *   已经剥到 −4 级以下的目标不再加分。`ai.finish`（默认关）打开时残血目标也多一档分。
 * 够不到怎么办：reach 就是本招射程，不够先走近；鞭长够不到就落空，不付任何代价。
 * 放完之后：命中才剥甲（缠卷式还拖近并减速），交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    

    function firelashDeflation(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.stage(context, target, "def");
        return typeof value === "number" ? value : 0;
    }

    function firelashWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("firelash", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firelashWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firelashWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 17;
            if (distance <= capability.data.range) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "strip", true) && firelashDeflation(context, target) > -4) score += 10;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.45) score += 9;
            return score;
        }
    });

    addPreferences("firelash", {}, [
        field(pathOf("entangle"), "缠卷式", "boolean", {
            help: "开启：命中后把目标朝自己拖 1～2 格并短暂减速、剥甲两级；代价是威力 ×0.82、鞭长 ×0.85、起手 +3 刻、收招 +2 刻、冷却 +6 刻。关闭（鞭挞式）：更远、更重的一鞭，剥甲一级，出手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动甩鞭，先走近。调大愿意从更远处先手剥甲。"
        }),
        field(pathOf("ai.strip"), "优先未剥防目标", "boolean", {
            help: "开启：防御还没被剥到 −4 级以下的目标排得更前，把剥甲留给收益还大的对手；关闭则所有目标同价。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一鞭收掉；关闭则所有目标同价。"
        })
    ]);
}
