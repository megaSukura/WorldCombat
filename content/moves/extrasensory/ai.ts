/**
 * 神通力 / extrasensory 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内。它落在目标**当下位置**的点上（kind=point），
 *   所以优先挑那些短时间内不会离开原地的目标：沉睡、被定住（`protectedControl`）的对手，或挤在一起、总有人留在圈里的敌人。
 * 选择倾向：圈内还挤着别的敌人时加分（一次攥住一小片）；对手已经被别的招打懵时略降，把手里的伏笔留给还能动的目标。
 */
namespace PokemonSkills {
    function extrasensoryCount(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function extrasensoryWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 13);
    }

    CompanionBehavior.registerUse(extrasensoryId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return extrasensoryWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !extrasensoryWants(context, capability, target)) return 0;
            let base = 20;
            if (CompanionBehavior.protectedControl(target)) base += 14;
            const count = extrasensoryCount(context, target, 1.8);
            if (count >= 2) base += Math.min(16, (count - 1) * 8);
            if (CompanionBehavior.status(context, target, "flinch")) base -= 6;
            return base;
        }
    });

    addPreferences(extrasensoryId, {}, [
        field(pathOf("premonition"), "伏击式", "boolean", {
            help: "开启：幻影留得更久、合拢圈更大、威力更高，但冷却更长——赌对手会停在预判的点上，适合压住沉睡/被定身的目标。关闭（即时式，默认）：合拢更快、起手更短、冷却更短，但圈更小、威力略低，更依赖对手当下不动。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 22, step: 1,
            help: "超过这个距离就不主动落点，先走近。越大越会在远处先布下伏笔。"
        })
    ]);
}
