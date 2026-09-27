/**
 * 破壳 / shellsmash 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：壳一破，防御与特防永久下降，所以伙伴只在**对手还隔着一段距离**、且自己**还扛得住**的时候
 *   先破壳，把爆发留到接下来的交手。移动中（骑乘）不破壳。
 * 什么时候最想出手：威胁在 ai.minGap（默认 4）之外、生命比例不低于 ai.minHealth（默认 0.45），并且这次破壳
 *   **确实还有进攻侧或速度的余额可拿**（阶数封顶后不再为无用余项再交双防）：按实际剩余空间估出收益
 *   （攻／特攻／速度各还能涨多少）与代价（防／特防各还会掉多少，已到 −6 则不再掉），只有收益不小于代价才出手。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：攻／特攻／速度猛涨、防／特防永久下降；交回共享交战计划，趁窗口扑上去。
 */
namespace PokemonSkills {
    /** 本次破壳在满阶/满底夹取后还能实际拿到的收益与要付的代价；收益为 0 或不足以抵偿代价时不再破壳。 */
    function shellsmashWorth(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context);
        const total = !!(capability.data.config && capability.data.config.total === true);
        const gift = total ? 3 : 2, toll = total ? 2 : 1;
        let gain = 0, loss = 0;
        ["atk", "spa", "spe"].forEach(function (stat) {
            gain += Math.max(0, Math.min(gift, 6 - CompanionBehavior.stage(context, self, stat)));
        });
        ["def", "spd"].forEach(function (stat) {
            loss += Math.max(0, Math.min(toll, 6 + CompanionBehavior.stage(context, self, stat)));
        });
        return gain > 0 && gain >= loss;
    }

    CompanionBehavior.registerUse("shellsmash", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!shellsmashWorth(context, capability)) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.45)) return false;
            return CompanionBehavior.distance(self.point, threat.point) >= CompanionBehavior.ai<number>(capability, "minGap", 4);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            if (!shellsmashWorth(context, capability)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.45)) return 0;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 4)) return 0;
            return 100;
        }
    });

    addPreferences("shellsmash", {}, [
        field(pathOf("ai.minGap"), "安全距离", "number", {
            min: 0, max: 12, step: 1,
            help: "威胁近于这个距离时不再破壳、直接交战；壳破了防御会永久下降，调大更保守。"
        }),
        field(pathOf("ai.minHealth"), "最低生命", "number", {
            min: 0.1, max: 1, step: 0.05,
            help: "生命低于这个比例时不再破壳；防御本就吃紧，调高更不愿意冒险。"
        })
    ]);
}
