/**
 * 流星群 / dracometeor 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 17）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.still`（默认开）打开时，停在原地不动的目标排前——陨石落点提交后不再追人，跑动中的敌人会白砸；
 *   身边挤着更多敌人的目标也排前（流星式把落点铺成一片），血厚的大块头同样加分。
 *   目标贴得太近（小于 `ai.minRange`，默认 5 格）时排后，留着距离再砸更能发挥射程。
 * 够不到怎么办：reach 就是本招射程，不够就靠近；落点正上方有屋顶挡住时降权，收益会大打折扣。
 * 放完之后：一记高威力特殊龙并把落点铺开；交回共享交战计划。
 */
namespace PokemonSkills {
    function dracometeorWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    function dracometeorCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 4) count++;
        }
        return count;
    }

    /** 目标正上方一段高度内是否被屋顶挡住（下落弹体会在上层炸）。 */
    function dracometeorUnderRoof(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), point = CompanionBehavior.point(target.point);
        const hit = world.clipBlocks(point.plus(CompanionBehavior.point([0, 1, 0])), point.plus(CompanionBehavior.point([0, 12, 0])));
        return hit !== null && hit.blocked();
    }

    CompanionBehavior.registerUse("dracometeor", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dracometeorWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !dracometeorWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 24;
            if (distance <= capability.data.range) score += 6;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 5)) score -= 8;
            if (CompanionBehavior.ai<boolean>(capability, "spread", true) && dracometeorCluster(context, target) > 0) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            if (CompanionBehavior.ratio(target) > 0.6 || (target.height || 0) >= 2.0) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "still", true)) {
                const velocity = CompanionBehavior.velocity(context, target);
                const moving = velocity !== null &&
                    Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]) > 0.03;
                score += moving ? -10 : 6;
            }
            if (dracometeorUnderRoof(context, target)) score -= 12;
            return score;
        }
    });

    addPreferences("dracometeor", {}, [
        field(pathOf("barrage"), "流星式", "boolean", {
            help: "开启：召 count 颗陨石散布在目标周围、各自固定落点逐个砸下，每颗威力 ×0.8、起手 +5 刻、冷却 +8 刻；人群里覆盖更好。关闭（坠星式）：一颗大陨石直落点选中心，单点更重、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 8, max: 24, step: 1,
            help: "超过这个距离就不主动召唤，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.spread"), "群敌优先", "boolean", {
            help: "开启：身边挤着更多敌人的目标排前，用流星式把落点铺成一片；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.minRange"), "近身保留距离", "number", {
            min: 0, max: 9, step: 1,
            help: "目标比这个距离更近时把流星群排后（0＝不限制）。调高让它把这一记留在拉开距离的时候用。"
        }),
        field(pathOf("ai.still"), "只砸停留目标", "boolean", {
            help: "开启：落点在召唤时固定、不追着人走，所以停在原地的目标排前，跑动中的明显降权；关闭则不论目标动不动都按普通排序。"
        })
    ]);
}
