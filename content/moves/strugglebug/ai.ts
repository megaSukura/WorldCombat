/**
 * 虫之抵抗 / strugglebug 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为心、贴地整圈推出的虫群。`ready` 要求身周 `ai.maxChase`（默认 7）格内至少站着
 * `ai.minFoes`（默认 2）个可见、敌对的敌人——它是被围住时把一圈人一起削弱的招，只有一个目标时不值。
 * `available` 还要求目标在这个考虑距离内。
 * 对谁出手：被贴身围住时最值；自己生命偏低时再抬一档，把身边人一起拖慢、拉开距离。
 * 够不到怎么办：交给共享接近逻辑；走到半径以内就原地扎稳、把虫群推出去。
 * 放完之后：一圈人的特攻都掉了、脚也被缠住，伙伴交回共享顺序。
 */
namespace PokemonSkills {
    function strugglebugCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 7);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function strugglebugWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(strugglebugId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false
                && strugglebugCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return strugglebugWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !strugglebugWants(context, capability, target)) return 0;
            const count = strugglebugCount(context, capability);
            let base = 20;
            if (count >= 3) base += Math.min(20, (count - 2) * 6);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 6;
            return base;
        }
    });

    addPreferences(strugglebugId, { ai: { maxChase: 7, minFoes: 2 } }, [
        number("ai.maxChase", "考虑距离", 2, 16, 1),
        number("ai.minFoes", "涌到人数", 1, 6, 1)
    ]);
}
