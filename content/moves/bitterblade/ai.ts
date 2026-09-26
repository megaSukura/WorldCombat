/**
 * 悔念剑 / bitterblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 6）格内。它是一趟身前火弧，
 *   `ai.cluster`（默认开）按「朝这个方向挥能罩住几个有效敌人」给朝向打分，把这一记当成一次清场：
 *   候选目标身后挤着越多敌人，分越高，伙伴因此会挑最能扫到一片的那个朝向。
 *   自身生命低于 `ai.hurtBelow`（默认 0.7）时再加一档——悔意让这一剑更沉、回得更多，残血正是它最好的燃料。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是剑距。
 * 放完之后：弧内的敌人都挂了彩、施法者也回了血，交回共享顺序。
 */
namespace CompanionBehavior {
    /** 朝该目标挥出一道扇弧能罩住的非友方数（含目标本身），就是伙伴要挑的朝向。 */
    function bitterBladeCoverage(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        const reach = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-4) return 1;
        const ux = dx / length, uz = dz / length;
        const sweep = !!(item.data.config && item.data.config.sweep === true);
        const cosHalf = Math.cos((sweep ? 75 : 25) * Math.PI / 180);
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const od = Math.sqrt(ox * ox + oz * oz);
            if (od > reach || od < 1e-4) continue;
            if ((ox * ux + oz * uz) / od >= cosHalf) count++;
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
        /** 朝向：取目标这一小撮敌人的水平中心，让一趟火弧罩住最多人；中心贴得太近就仍朝原目标。 */
        target: function (context, capability, selected) {
            const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
            const reach = capability.data.range;
            let cx = selected.point[0], cz = selected.point[2], count = 1;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
                if (CompanionBehavior.distance(other.point, selected.point) > 3.2) continue;
                if (CompanionBehavior.distance(other.point, self.point) > reach) continue;
                cx += other.point[0]; cz += other.point[2]; count++;
            }
            const center = [cx / count, self.point[1], cz / count];
            const point = JSON.parse(JSON.stringify(selected));
            point.ref = "";
            const dx = center[0] - self.point[0], dz = center[2] - self.point[2];
            point.point = Math.sqrt(dx * dx + dz * dz) < 0.5 ? selected.point : center;
            return point;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            const self = CompanionBehavior.source(context);
            const dist = CompanionBehavior.distance(self.point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            const coverage = bitterBladeCoverage(capability, context, self, target);
            let score = 21 + Math.min(24, coverage * 6);
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true) && coverage < 2) score -= 8;
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
            help: "开启：按「朝某个方向挥能一次罩住几个有效敌人」挑朝向，身前挤着敌人时把悔念剑排前当清场手段；关闭：只当一记普通近战排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.hurtBelow"), "残血加成阈值", "number", {
            min: 0.2, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，悔意让这一剑更沉，优先级抬一档；越高越早把它当反打手段。"
        })
    ]);
}
