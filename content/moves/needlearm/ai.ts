/**
 * 尖刺臂 / needlearm 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 7）格内。它只打贴身一个目标，
 *   价值在于**打完在地上留一片荆棘**，所以优先对「会留在这块地上」的目标出手：贴地的目标、挤在一起的敌人。
 * `ai.seed`（默认开）打开时，只为「能扎到人」的局面加分——目标悬空、正在快速离开时降档，把这一挥留到更好的时机。
 */
namespace PokemonSkills {
    function needlearmCount(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function needlearmWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(needlearmId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return needlearmWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !needlearmWants(context, capability, target)) return 0;
            let base = 22;
            const count = needlearmCount(context, target, 1.6);
            if (count >= 2) base += Math.min(16, (count - 1) * 8);
            if (CompanionBehavior.ai<boolean>(capability, "seed", true)) {
                if (target.grounded === true) base += 8;
                if (CompanionBehavior.fleeing(context, target)) base -= 10;
            }
            return base;
        }
    });

    addPreferences(needlearmId, {}, [
        field(pathOf("briar"), "荆棘式", "boolean", {
            help: "开启：荆棘范围更大、留得更久、扎得更疼，但挥击更轻、起手更慢、冷却更长，适合封锁地面、拖住对手。关闭（挥击式，默认）：挥击更重、出手更快、冷却更短，但只留一小片刺。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动挥击，先走近。越大越会先挥空留刺，也越容易在接近时被对手走开。"
        }),
        field(pathOf("ai.seed"), "只为能扎到人", "boolean", {
            help: "开启：目标贴地或敌人成堆时才优先挥击，跑动中的目标降档，把这一挥留到荆棘能扎到人时；关闭：当普通近身招处理，不为荆棘加分。"
        })
    ]);
}
