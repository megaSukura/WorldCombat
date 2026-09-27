/**
 * 啄 / peck 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 4）格内；喙程很短，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.pickAir`（默认开）把已经离地的目标排得更前——啄正好把它压回地面；`ai.finish` 收残血。
 * 距离按身体表面（中心距减去两边半个身宽）算，宽体目标按真实体表判断，而不是只看中心球距。
 * 出手位置：贴身（1.4 格内），越靠越容易在对手起手前抢到这一啄。
 * 放完之后：交回共享交战计划，冷却短，适合一记接一记地补。
 */
namespace PokemonSkills {
    function peckValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 身体表面距离：中心距减去两边半个身宽。 */
    function peckSurfaceDistance(self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        const radii = (self.width !== undefined ? self.width : 0.9) * 0.5 + (target.width !== undefined ? target.width : 0.9) * 0.5;
        return Math.max(0, CompanionBehavior.distance(self.point, target.point) - radii);
    }

    CompanionBehavior.registerUse("peck", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!peckValid(target)) return false;
            return peckSurfaceDistance(CompanionBehavior.source(context), target)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, capability, target) { return peckValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const surface = peckSurfaceDistance(CompanionBehavior.source(context), target);
            if (surface > capability.data.range) return 0;
            let score = 12;
            if (CompanionBehavior.ai<boolean>(capability, "pickAir", true) && target.grounded === false)
                score += surface <= 2 ? 16 : 10;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 12;
            return score;
        }
    });

    addPreferences("peck", {}, [
        flag("dive", "探身式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.pickAir", "优先空中目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
