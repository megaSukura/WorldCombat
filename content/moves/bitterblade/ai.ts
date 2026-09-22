/**
 * 悔念剑 / bitterblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 6）格内。它是一趟身前火弧，
 *   `ai.cluster`（默认开）在射程内可及的非友方达到两个以上时抬高优先级，把这一记当成一次清场；
 *   自身生命低于 `ai.hurtBelow`（默认 0.7）时再加一档——悔意让这一剑更沉、回得更多，残血正是它最好的燃料。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是剑距。
 * 放完之后：弧内的敌人都挂了彩、施法者也回了血，交回共享顺序。
 */
namespace CompanionBehavior {
    function bitterBladeCrowd(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity): number {
        const reach = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    registerUse("bitterblade", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            const self = CompanionBehavior.source(context);
            const dist = CompanionBehavior.distance(self.point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            const crowd = bitterBladeCrowd(capability, context, self);
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                if (crowd >= 2) score += 12 + Math.min(16, crowd * 5);
            } else if (crowd >= 2) score += 6;
            if (dist <= capability.data.range) score += 5;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "hurtBelow", 0.7)) score += 14;
            return score;
        }
    });

    PokemonSkills.addPreferences("bitterblade", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("sweep"), "横扫式", "boolean", {
            help: "开启：剑弧更宽更远、一次扫到身前一片，但每个目标更轻、抽得更少、收招更慢。关闭：直斩式，弧窄而深、单点更重、抽得更足、出手更快。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动挥剑，先走近。越大越愿意在更远处先扫一记。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cluster"), "围住才挥", "boolean", {
            help: "开启：身前射程内挤着两个以上敌人时把悔念剑排前，当清场手段；关闭：只当一记普通近战排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.hurtBelow"), "残血加成阈值", "number", {
            min: 0.2, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，悔意让这一剑更沉，优先级抬一档；越高越早把它当反打手段。"
        })
    ]);
}
