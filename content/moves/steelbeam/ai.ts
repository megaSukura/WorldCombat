/**
 * 铁蹄光线 / steelbeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、在 `ai.maxChase` 之内，且**自己足够健康**——这一招固定扣掉最大生命的
 * 一大截，生命低于 `ai.minHealth` 时不出手（除非对手已经残到值得一收）。默认门槛高，是为了不让伙伴把自己
 * 剥成一具空壳。
 * 对谁出手：在所有够得到的敌人里挑最残的那个（这一记往往就是终结），残血相同时挑最近的。
 * 怎么够到：共享接近把身位收进钢梁长度以内，再沿目标方向射出。出手前用只读世界入口
 *   `CompanionBehavior.world(context).clear` 探自身到目标的通视线；被墙挡住时钢梁会在墙面截断，不再发起。
 * 放完之后：交回共享交战计划；放完自己掉了一截血，通常会轮到更便宜的招。
 */
namespace PokemonSkills {
    function steelbeamValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 自身到目标是否有通视射线；被地形挡住时钢梁会先撞墙，够不到目标。 */
    function steelbeamReachable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(steelbeamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            const self = CompanionBehavior.source(context);
            const reach = CompanionBehavior.ai<number>(capability, "maxChase", 11);
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            let best: CompanionBehavior.Entity | null = null, bestScore = -1;
            const consider = function (candidate: CompanionBehavior.Entity): void {
                if (!steelbeamValid(candidate)) return;
                const range = CompanionBehavior.distance(self.point, candidate.point);
                if (range > Math.max(reach, capability.data.range)) return;
                const score = (1 - CompanionBehavior.ratio(candidate)) * 100 - range;
                if (score > bestScore) { best = candidate; bestScore = score; }
            };
            consider(proposed);
            for (let i = 0; i < nearby.length; i++) consider(nearby[i]);
            return best || proposed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!steelbeamValid(target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return false;
            if (!steelbeamReachable(context, target)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.55);
            return CompanionBehavior.ratio(self) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) { return steelbeamValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!steelbeamReachable(context, target)) return 0;
            let score = 22;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 26;
            // 固定自损纳入评分：自身越虚，这一笔越舍不得付。
            score -= Math.round((1 - CompanionBehavior.ratio(self)) * 30);
            if (CompanionBehavior.ratio(self) >= 0.8) score += 8;
            return Math.max(1, score);
        }
    });

    addPreferences(steelbeamId, {}, [
        field(pathOf("temper"), "淬火式", "boolean", {
            help: "开启后自损比例乘0.65，钢梁威力×0.9、长度×0.82、粗细×0.8，起手多2刻；关闭时威力×1.1，长度与粗细×1.12，承担通常自损。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离不主动发起铁蹄光线，先靠近。越大越早发起，也越容易白付一笔自损。"
        }),
        field(pathOf("ai.minHealth"), "自损门槛", "number", {
            min: 0.2, max: 0.95, step: 0.05,
            help: "自身生命低于这个比例时不再主动出手（除非对手已残）。这一招固定扣掉一大截最大生命，门槛越低越敢用，也越容易把自己剥到危险线。"
        })
    ]);
}
