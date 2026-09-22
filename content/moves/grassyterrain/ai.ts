/**
 * 青草场地 / grassyterrain 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内，且自己还没有站在一片青草地里（不浪费一次出手）。
 * 出手前的位置：`ai.advance` 关闭（默认）时把草种在脚下，先托住自己；开启时往前压到交战区中间。
 * 为什么值得先手：草地给自己和队友回血、给草招加成；但草地对双方一视同仁——所以自己或队友受伤时
 * priority 抬到 60，其余情况 40，插在 `world_combat:defend` 之前当作开打前的布置。
 * 放完之后把伤害交回共用交战计划；还站在草地里时不再重复。
 */
namespace CompanionBehavior {
    const grassyChase = PokemonSkills.number("ai.maxChase", "种草距离", 2, 24, 1);
    grassyChase.help = "伙伴只在威胁离自己这么远以内时才考虑青草场地；调小只在贴身时种草，调大愿意提前布置。";
    const grassyAdvance = PokemonSkills.flag("ai.advance", "把草地压向对手");
    grassyAdvance.help = "开启后把草种在自己与威胁之间，让交战区落在草上；关闭则种在脚下先托住自己。";

    PokemonSkills.addPreferences("grassyterrain", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [grassyChase, grassyAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function grassyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "grassyterrain") return items[i];
        return null;
    }
    function grassyInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.grassyField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function grassyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        return !grassyInside(context);
    }
    function grassyInjured(context: WorldBehavior.Context): boolean {
        const self = source(context);
        if (ratio(self) < 0.8) return true;
        return (context.facts.nearby as Entity[]).some(other => other.friendly && other.health > 0 && ratio(other) < 0.8);
    }

    registerUse("grassyterrain", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) { return grassyInjured(context) ? 60 : 40; },
        available: function (context, item, _purpose, _target) { return grassyWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_grassyterrain/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = grassyCapability(context);
            if (!item || !grassyWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_grassyterrain:" + threat.ref, kind: "world_combat:move_grassyterrain", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_grassyterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_grassyterrain") return [];
            const item = grassyCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !grassyWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_grassyterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_grassyterrain");
    });
}
