/**
 * 广域战力 / expandingforce —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 14）格内时出手。
 * 已经贴地站在自己铺的精神场地上时按「引爆」评估：数**自己**周围 6 格内的敌人，聚起 `ai.crowd`
 * 个或更多才抬到高优先级；否则按普通施放评估，落到目标附近、周围 6 格聚起同样多敌人时抬优先级。
 * 「是否站在自己的场地上」与 action 共用同一个单元函数（真实脚底 + 同层 + 可见 + 在半径内），
 * 所以隔层、隔墙或重叠的场地不会让 AI 误判；只在自身附近值得群攻时才主动引爆，够不到交给共享接近逻辑。
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

    /** 施法者是否贴地站在一片被实际识别的自己的场地上（决定这一次会走引爆分支）。 */
    function expandingforceEmpowered(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), self = source(context);
        var actor = world.actor(self.ref), body = actor ? world.observe(actor) : null;
        return !!body && body.grounded() && !!PokemonSkills.expandingforceFieldAt(world, PokemonSkills.expandingforceFoot(body));
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
            var self = source(context), crowd = ai(item, "crowd", 2);
            if (expandingforceEmpowered(context))
                return expandingforceCrowd(context, self.point, 6) >= crowd ? 70 : 0;
            return expandingforceCrowd(context, target.point, 6) >= crowd ? 55 : 10;
        }
    });
    PokemonSkills.addPreferences("expandingforce", { ai: { maxChase: 14, leaveStation: false, crowd: 2 } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位"),
            PokemonSkills.number("ai.crowd", "群体阈值", 1, 5, 1)]);
}
