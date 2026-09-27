/**
 * 毒丝 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内。是否值得出手看**还剩多少控制空间**——
 *   目标还没中毒就补毒，还没被减速就补速度下降；两样都已经在身（无论来源是中毒还是剧毒 + 已被减速）
 *   就不再浪费一次。laced 只代表丝还缠着，不单独否决：重新吐丝仍能刷新毒和减速。
 * 对谁出手：当前威胁；速度比伙伴快、或还没中毒的优先——先削弱最快、最难缠的那个。
 * 够不到怎么办：reach 就是吐丝距离，超出的先走近；驻守且未开离位时只在原地够得到才吐。
 * 放完之后：目标中毒、掉速度，并按配置被拽近或被钉住；伙伴随即交回共享顺序再决定追击或拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("toxicthread", { ai: { maxChase: 8, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 目标当前速度已低于基准（被任何来源减速）。 */
    function toxicthreadSlowed(context: WorldBehavior.Context, threat: Entity): boolean {
        return stage(context, threat, "spe") < 0;
    }

    /** 毒（含剧毒）与减速都已在身时，这一缕丝已没有可追加的控制。 */
    function toxicthreadSaturated(context: WorldBehavior.Context, threat: Entity): boolean {
        const venom = status(context, threat, "poison") || status(context, threat, "toxic");
        return venom && toxicthreadSlowed(context, threat);
    }

    function toxicthreadWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        const self = source(context), reach = ai<number>(item, "maxChase", 8);
        const gap = distance(self.point, threat.point);
        if (context.facts.focus !== threat.ref && gap > reach) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay")
            && !ai<boolean>(item, "leaveStation", false) && gap > reach) return false;
        return true;
    }

    registerUse("toxicthread", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || toxicthreadWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !toxicthreadWants(context, item, target) || toxicthreadSaturated(context, target)) return 0;
            const self = source(context), config = item.data.config;
            const faster = typeof target.speed === "number" && typeof self.speed === "number" && target.speed > self.speed ? 12 : 0;
            const venom = status(context, target, "poison") || status(context, target, "toxic");
            const poisonGain = venom ? 0 : 10;
            const slowGain = toxicthreadSlowed(context, target) ? 0 : 8;
            const provoked = self.hurtAgo < 40 ? 8 : 0;
            // 拉/钉的收益：拉近远目标，或钉住正扑向自己的近战；全抗击退的目标拉不动，只保留毒与减速收益。
            const reel = !!(config && config.reel === true);
            const gap = distance(self.point, target.point);
            const actor = world(context).actor(target.ref);
            const resistance = actor !== null ? world(context).attributeValue(actor, "minecraft:generic.knockback_resistance") : null;
            const movable = resistance === null || resistance.value() < 0.9;
            let control = 0;
            if (reel) { if (movable && gap > 3) control = 6; }
            else if (target.attacking === self.ref) control = 6;
            return Math.min(100, 50 + faster + poisonGain + slowGain + provoked + control);
        }
    });
}
