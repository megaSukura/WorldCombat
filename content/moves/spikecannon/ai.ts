/**
 * 尖刺加农炮的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 14）格之内；更远交给共享接近逻辑。
 *   它射程最长、出手最慢，愿意从远处先手，也能在近身时把对手顶开重新拉出距离。
 * 对谁出手：`ai.pushMelee`（默认开）打开时，贴到 4 格内的目标排得更前——用贯穿顶退把它们推出去，
 *   给自己争取再一次上膛的时间；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；钉直飞无追踪，走得快的目标要更近才稳。
 * 放完之后：这一梭打完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function spikecannonWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse("spikecannon", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spikecannonWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !spikecannonWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 14;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "pushMelee", true) && distance <= 4) score += 10;
            return score;
        }
    });

    addPreferences("spikecannon", {}, [
        field(pathOf("lance"), "穿甲式", "boolean", {
            help: "开启：单钉威力 ×1.3、可贯穿 3 人、顶退 ×1.4，适合打成一排的目标；代价是钉数收在 3 发、射程 ×0.95、间隔 +2 刻、起手 +3 刻、冷却 +5 刻。关闭（连发式）：钉数可到 5 发、射程更远、间隔更密、出手更快，代价是单钉威力 ×0.9、只贯穿 1~2 人、顶退更小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离就不主动开炮，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.pushMelee"), "优先顶开贴身目标", "boolean", {
            help: "开启：贴到 4 格内的目标排得更前，用贯穿顶退把它们推开；关闭则所有目标同价。"
        })
    ]);
}
