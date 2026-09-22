/**
 * 交换场地 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、进入 ai.maxChase 内，且身边射程内有一个还活着的同伴——要有一个人可以换。
 * 什么时候最想出手：自己生命比例掉到 ai.retreatBelow 以下时 priority 100（这就是脱身手段，越过共享交战次序）；
 *   否则 40，在有威胁时把位置换一下、顺带误导追兵。
 * 对谁出手：射程内离自己最近的同伴；`target` 把施放对象定为该同伴，`approachTarget` 保持自身（换位不需要先走近谁）。
 * 够不到怎么办：同伴在射程外就不进入候选；威胁太远也不理会。
 * 放完之后：两人对调、追兵目标跟着对调，交回共享顺序继续战斗。
 * 配置：ai.maxChase 决定追多远，ai.retreatBelow 决定多残才当逃生用，tandem（同调／独行）改变够得多远与冷却。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("allyswitch", { ai: { maxChase: 14, retreatBelow: 0.4, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 26, 1),
        PokemonSkills.number("ai.retreatBelow", "脱身血量", 0.1, 0.9, 0.05),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function allyswitchThreat(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        return distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 14);
    }
    function allyswitchPartner(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), range = item.data.range, nearby = context.facts.nearby as Entity[];
        let best: Entity | null = null, bestDistance = Infinity;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0 || !other.visible || other.ref === self.ref) continue;
            const d = distance(other.point, self.point);
            if (d > range || d >= bestDistance) continue;
            best = other; bestDistance = d;
        }
        return best;
    }

    registerUse("allyswitch", {
        protocols: ["world_combat:cover"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, item, _purpose, _target) { return allyswitchThreat(context, item); },
        selectTarget: function (context, item, _proposed) { return allyswitchThreat(context, item) ? allyswitchPartner(context, item) : null; },
        accepts: function (context, _item, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && target.visible && target.ref !== self.ref;
        },
        approachTarget: function (context) { return source(context); },
        target: function (context, item, _target) { return allyswitchPartner(context, item); },
        priority: function (context, item, _target) {
            if (!allyswitchThreat(context, item) || !allyswitchPartner(context, item)) return 0;
            return ratio(source(context)) <= ai<number>(item, "retreatBelow", 0.4) ? 100 : 40;
        }
    });
}
