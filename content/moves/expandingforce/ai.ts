/**
 * 广域战力 / expandingforce —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 14）格内时出手；
 * 当目标附近 6 格内聚起 `ai.crowd`（默认 2）个或更多敌人时 `priority` 抬到 60，抢先落下这一发，
 * 为接下来踩进场地引爆铺路。够不到交给共享接近逻辑。
 */
namespace CompanionBehavior {
    function expandingforceCrowd(context: WorldBehavior.Context, point: number[], radius: number): number {
        var nearby: WorldMethods.Subject[] = context.facts.nearby || [], count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly === true || other.visible === false)
                continue;
            if (distance(other.point, point) <= radius)
                count++;
        }
        return count;
    }
    registerUse("expandingforce", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            return !!target && !!target.health && target.health > 0;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref)
                return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 14);
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target)
                return 0;
            return expandingforceCrowd(context, target.point, 6) >= ai(item, "crowd", 2) ? 60 : 0;
        }
    });
    PokemonSkills.addPreferences("expandingforce", { ai: { maxChase: 14, leaveStation: false, crowd: 2 } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位"),
            PokemonSkills.number("ai.crowd", "群体阈值", 1, 5, 1)]);
}
