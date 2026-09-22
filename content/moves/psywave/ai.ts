/**
 * 精神波 / psywave —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 15）格内；够不到交给共享接近逻辑。
 *   它便宜、冷却短，是常规远程输出。
 * 对谁出手：`ai.crowd`（默认开）打开时，目标身边还站着别的非友方（波前能一次穿过几个）就抬价；
 *   关闭则只看单目标，按普通远程排序。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：交回共享交战计划；本此摇出的强度只决定伤害，不改变行为。
 */
namespace PokemonSkills {
    function psywaveCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function psywaveWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    CompanionBehavior.registerUse(psywaveId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psywaveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psywaveWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 18 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                const crowd = psywaveCrowd(context, target, 2.4);
                if (crowd >= 3) score += Math.min(20, (crowd - 1) * 7);
            }
            return score + Math.round(CompanionBehavior.ratio(target) * 4);
        }
    });

    addPreferences(psywaveId, { ai: { maxChase: 15, crowd: true } }, [
        field(pathOf("surge"), "涌动", "boolean", {
            help: "开启：威力 ×1.2、波动幅度 ×1.5，更容易摇出高低两端，收招快 3 刻；代价是基础威力略降、射程不变，冷却不降。关闭（稳流）：威力与波动都小一半，射程 ×1.1、冷却 −3 刻，稳而远。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 22, step: 1,
            help: "超过这个距离就不主动推波，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "优先扎堆", "boolean", {
            help: "开启：目标身边还站着别的非友方时优先推出一道能穿透的波；关闭则只按普通远程攻击排序。"
        })
    ]);
}
