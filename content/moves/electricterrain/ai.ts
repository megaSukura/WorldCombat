/**
 * 电气场地 / electricterrain 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内，自己不在电场上，且交战中还没有睡着的敌人
 * （电场会把睡着的人电醒，绝不能在敌人睡着时铺）。自己或队友睡着时 priority 抬到 65——铺场把人电醒；
 * 其余情况 42，插在 `world_combat:defend` 之前当作开打前的布置。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先护住自己；开启时前压到交战区中间。
 * 放完之后把伤害交回共用交战计划；还站在电场上时不再重复。
 */
namespace CompanionBehavior {
    const electricChase = PokemonSkills.number("ai.maxChase", "输电距离", 2, 24, 1);
    electricChase.help = "伙伴只在威胁离自己这么远以内时才考虑电气场地；调小只在贴身时铺，调大愿意提前布置。";
    const electricAdvance = PokemonSkills.flag("ai.advance", "把电场压向对手");
    electricAdvance.help = "开启后把电场按在自己与威胁之间，让交战区带电；关闭则按在脚下先护住自己。";

    PokemonSkills.addPreferences("electricterrain", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [electricChase, electricAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function electricCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "electricterrain") return items[i];
        return null;
    }
    function electricInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.electricField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function electricSleeping(context: WorldBehavior.Context, friendly: boolean): boolean {
        return (context.facts.nearby as Entity[]).some(other =>
            other.health > 0 && !!other.friendly === friendly && status(context, other, "sleep"));
    }
    function electricWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (electricSleeping(context, false)) return false;
        return !electricInside(context);
    }

    registerUse("electricterrain", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) {
            return status(context, source(context), "sleep") || electricSleeping(context, true) ? 65 : 42;
        },
        available: function (context, item, _purpose, _target) { return electricWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_electricterrain/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = electricCapability(context);
            if (!item || !electricWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_electricterrain:" + threat.ref, kind: "world_combat:move_electricterrain", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_electricterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_electricterrain") return [];
            const item = electricCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !electricWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", false) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_electricterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_electricterrain");
    });
}
