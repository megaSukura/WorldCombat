/**
 * 冰雹 / hail 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片雹区里。
 * 出手前的位置：`ai.advance` 开启（默认）时把雹区压在自己与威胁之间；关闭时压在脚下。
 * 什么时候最想出手：这一招只砸非冰之躯——威胁不是冰属性时 priority 抬到 58，是冰属性时降到 40，
 *   自己或附近队友带冰属性时再抬一点（冰之躯免疫反而是净赚）。接在 `world_combat:defend` 之前。
 * 放完之后把伤害交回共用交战计划；还站在雹区里时不再重复。
 */
namespace CompanionBehavior {
    const hailChase = PokemonSkills.number("ai.maxChase", "落雹距离", 2, 24, 1);
    hailChase.help = "伙伴只在威胁离自己这么远以内时才考虑冰雹；调小只在贴身时落雹，调大愿意提前布置。";
    const hailAdvance = PokemonSkills.flag("ai.advance", "把雹区压向对手");
    hailAdvance.help = "开启后把雹区压在自己与威胁之间，让交战区落进雹里；关闭则压在脚下先护住自己。";

    PokemonSkills.addPreferences("hail", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [hailChase, hailAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function hailCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "hail") return items[i];
        return null;
    }
    function hailInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.hailField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function hailIce(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("ice") >= 0;
    }
    function hailWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !hailInside(context);
    }

    registerUse("hail", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            const threat: Entity | null = target || context.senses["world_combat:threat"];
            const self = source(context);
            let value = threat && !hailIce(context, threat) ? 58 : 40;
            if (hailIce(context, self)) value = Math.min(100, value + 6);
            return value;
        },
        available: function (context, item, _purpose, _target) { return hailWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_hail/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = hailCapability(context);
            if (!item || !hailWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_hail:" + threat.ref, kind: "world_combat:move_hail", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_hail/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_hail") return [];
            const item = hailCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !hailWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_hail/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_hail");
    });
}
