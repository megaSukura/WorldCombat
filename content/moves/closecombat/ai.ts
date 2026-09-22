/**
 * 近身战 / closecombat 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格之内能够到；更远交给共享接近逻辑。
 *   因为这一串拳在提交那一刻就弃守（自身防御与特防各降一级），只有在自身生命比例不低于 `ai.minHealth`
 *   （默认 0＝不限制）时才起手——血薄时不拿命换这一串。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分——用一串最快的连打在身价下跌前收掉。
 * 够不到怎么办：reach 就是本招射程，先贴近再打；串拳途中目标走开就断，代价已经付过。
 * 放完之后：交回共享交战计划等冷却；横扫式在人多时更值。
 */
namespace PokemonSkills {
    function closecombatWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0);
        return minHealth <= 0 || CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth;
    }

    CompanionBehavior.registerUse(closecombatId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return closecombatWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !closecombatWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = distance <= capability.data.range ? 16 : 0;
            if (distance <= 1.4) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 10;
            if (CompanionBehavior.ratio(self) > 0.6) score += 4;
            return score;
        }
    });

    addPreferences(closecombatId, { wide: false, ai: { maxChase: 6, finish: true, minHealth: 0 } }, [
        field(pathOf("wide"), "横扫式", "boolean", {
            help: "开启：连打同时扫到正面一片扇形内的其他敌人，各吃一部分威力；代价是总威力 ×0.85、收招 +2 刻、冷却 +4 刻。关闭（贯一式）：全部落在单个目标身上，单点更高。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动发起近身战，先贴近。调大愿意从更远处就抢进，也更容易在半路被走位甩开。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用最快的一串连打在身价下跌前收掉；关闭则所有目标同价。"
        }),
        field(pathOf("ai.minHealth"), "最低生命比例", "number", {
            min: 0, max: 0.9, step: 0.1,
            help: "自身生命比例低于这个值就不主动用近身战（0＝不限制）。调高能让它把这一串留给值得交换的局面。"
        })
    ]);
}
