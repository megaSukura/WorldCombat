/**
 * 求雨 / raindance 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片雨里（不浪费一次出手）。
 * 出手前的位置：`ai.advance` 开启（默认）时把雨叫在自己与威胁之间，让交战区落在雨里；关闭时叫在脚下。
 * 为什么值得先手：雨区同时给水招加成、压火招，还能浇灭自己或队友身上的灼伤与火焰——所以
 * 自己人带灼伤时 priority 抬到 70，其余情况 45，插在 `world_combat:defend` 之前当作开打前的布置。
 * 放完之后把伤害交回共用交战计划；还站在雨里时不再重复。
 */
namespace CompanionBehavior {
    const raindanceChase = PokemonSkills.number("ai.maxChase", "布雨距离", 2, 24, 1);
    raindanceChase.help = "伙伴只在威胁离自己这么远以内时才考虑求雨；调小只在贴身时叫雨，调大愿意提前布置。";
    const raindanceAdvance = PokemonSkills.flag("ai.advance", "把雨压向对手");
    raindanceAdvance.help = "开启后把雨叫在自己与威胁之间，让交战区落在雨里；关闭则叫在脚下先护住自己。";

    PokemonSkills.addPreferences("raindance", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [raindanceChase, raindanceAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function raindanceCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "raindance") return items[i];
        return null;
    }
    function raindanceInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.raindanceField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function raindanceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !raindanceInside(context);
    }
    function raindanceBurning(context: WorldBehavior.Context): boolean {
        const self = source(context);
        if (status(context, self, "burn")) return true;
        return (context.facts.nearby as Entity[]).some(other => other.friendly && other.health > 0 && status(context, other, "burn"));
    }

    registerUse("raindance", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) { return raindanceBurning(context) ? 70 : 45; },
        available: function (context, item, _purpose, _target) { return raindanceWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_raindance/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = raindanceCapability(context);
            if (!item || !raindanceWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_raindance:" + threat.ref, kind: "world_combat:move_raindance", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_raindance/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_raindance") return [];
            const item = raindanceCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !raindanceWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", true) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(3, length * 0.5);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_raindance/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_raindance");
    });
}
