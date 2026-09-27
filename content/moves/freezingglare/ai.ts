/**
 * 冰冷视线 / freezingglare 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；这一招需要通视，够不到先走近。
 * 对谁出手：默认（ai.preferChains 开）优先挑念力线沿当前跳跃距离与逐跳通视能确实连到的目标（用一次贪心链
 *   估算最多能多跳几个）；关闭则只看单个目标。免冻的冰属性/特性目标照常吃精神主伤，不再专门优先去冻它们。
 * 放完之后：瞬发结算，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("freezingglare", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 22, 1),
        PokemonSkills.flag("ai.preferChains", "优先可连跳目标")
    ]);

    /** Greedy copy of the real chain from the proposed target: nearest visible, unvisited enemy inside the current leap
     *  range with an unobstructed line, up to the current leap count. Returns the extra leaps beyond the first target. */
    function freezingglareChainReach(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const nearby = (context.facts.nearby as Entity[]) || [];
        const self = source(context);
        let chains = 2, range = 4.5;
        try {
            const access = world(context);
            const values = { world: access, actor: access.source(), detail: { values: item.data.config } };
            chains = Math.max(1, Math.round(PokemonSkills.p("freezingglare", "chains", values)));
            range = Math.max(1.5, PokemonSkills.p("freezingglare", "chainRange", values));
        } catch (error) { }
        if (chains < 2) return 0;
        const access = world(context);
        const reach = function (from: number[], to: number[]): boolean {
            return access.clear(WorldCombat.point(from[0], from[1], from[2]), WorldCombat.point(to[0], to[1], to[2]));
        };
        if (!reach(self.point, target.point)) return 0;
        const used: { [ref: string]: boolean } = {};
        used[target.ref] = true;
        let at = target.point, count = 1;
        while (count < chains) {
            let best: Entity | null = null, bestDistance = Infinity;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (used[other.ref] || other.friendly || other.health <= 0 || !other.visible) continue;
                const length = distance(at, other.point);
                if (length > range || length >= bestDistance) continue;
                if (!reach(at, other.point)) continue;
                best = other; bestDistance = length;
            }
            if (best === null) break;
            used[best.ref] = true;
            at = best.point;
            count++;
        }
        return count - 1;
    }

    registerUse("freezingglare", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 15);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 22 : 0;
            if (ai<boolean>(capability, "preferChains", true)) score += Math.min(24, freezingglareChainReach(context, capability, target) * 8);
            return score + Math.round(ratio(target) * 5);
        }
    });
}
