/**
 * 神通力 / extrasensory 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内。它落在目标**当下位置**的点上（kind=point），
 *   所以优先挑那些伏笔期间不会离开原地的目标：沉睡、被定住（`protectedControl`）的对手，或按当前速度估出跑不出合拢圈的敌人。
 * 选择倾向：圈内还挤着别的敌人时加分（一次攥住一小片）；伏笔里能跑出合拢圈的目标下调，把力留给会停下的目标；
 *   对手已经被别的招打懵时略降。
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

    /** 本个体当前合拢圈的真实半径；读不到原生个体时退回定义参考半径。 */
    function extrasensoryRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const access = CompanionBehavior.world(context);
        try {
            return Math.max(1.2, PokemonSkills.p(extrasensoryId, "radius", { world: access, actor: access.source(),
                skill: skills[extrasensoryId], detail: { values: item.data.config || {} } }));
        } catch (error) { return extrasensoryReference; }
    }

    /** 目标按当前速度在伏笔期间能移动的水平距离（格）：跑得出合拢圈又没被定住，这一攥多半落空。 */
    function extrasensoryTravel(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        let delay = 16;
        try {
            const access = CompanionBehavior.world(context);
            delay = Math.max(4, Math.round(PokemonSkills.p(extrasensoryId, "delay", { world: access, actor: access.source(),
                skill: skills[extrasensoryId], detail: { values: item.data.config || {} } })));
        } catch (error) { delay = 16; }
        const velocity = CompanionBehavior.velocity(context, target);
        if (!velocity) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) * delay;
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
            const held = CompanionBehavior.protectedControl(target);
            if (held) base += 14;
            const radius = extrasensoryRadius(context, capability);
            const count = extrasensoryCount(context, target, radius);
            if (count >= 2) base += Math.min(16, (count - 1) * 8);
            if (CompanionBehavior.status(context, target, "flinch")) base -= 6;
            // 没被定住的目标：伏笔里能跑出合拢圈就下调，把力留给会停下的目标或更密的圈。
            if (!held) {
                const travel = extrasensoryTravel(context, capability, target);
                if (travel > radius) base -= Math.min(18, Math.round((travel - radius) * 6) + 6);
            }
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
