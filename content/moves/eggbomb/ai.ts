/** Prefer slow targets; lead moving ground targets and allow for the egg's short roll. */
namespace PokemonSkills {
    function eggbombWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse("eggbomb", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        target: function (context, item, target) {
            const velocity = target.velocity || [0,0,0];
            if (!target.grounded || Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) < .04) return target;
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context), from = CompanionBehavior.point(self.point);
            const heading = WorldGeometry.flatUnit(CompanionBehavior.point(target.point).minus(from));
            // 提前量包含蛋的飞行与落地后的短滚，不再固定只算 5 刻。
            const lead = CompanionBehavior.ai<number>(item, "lead", 8);
            const aim = CompanionBehavior.point(target.point).plus(WorldCombat.point(velocity[0] * lead, 0, velocity[2] * lead)).minus(heading.scale(.4));
            const point = WorldGeometry.ground(access, aim);
            if (point.minus(from).length() > item.data.range) return target;
            const choice = JSON.parse(JSON.stringify(target)); choice.ref = ""; choice.point = [point.x(), point.y(), point.z()]; return choice;
        },
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return eggbombWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !eggbombWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 17;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "opportunist", true)) {
                if (!CompanionBehavior.fleeing(context, target)) score += 8;
                if (target.grounded === false) score -= 6;
            }
            return score;
        }
    });

    addPreferences("eggbomb", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不抡蛋，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.opportunist"), "挑站定的人", "boolean", {
            help: "开启：站着不动、没在跑的对手排得更前，离地的目标降到最后（原生 75 命中，打移动目标容易抡偏）；关闭则所有目标同价。"
        }),
        field(pathOf("ai.lead"), "移动目标提前量", "number", {
            min: 0, max: 24, step: 1,
            help: "对移动中的地面目标，往它去路前方预判这么多刻再落蛋；默认已算上蛋的飞行与落地后的短滚。越大越往远处拦，越小越贴着当前身位丢。"
        })
    ]);
}
