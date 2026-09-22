/**
 * 沙暴 / sandstorm 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片沙幕里（不空烧一次出手）。
 * 出手前的位置：`ai.advance` 开启（默认）时把沙幕扬在自己与威胁之间，让交战区落进沙里；关闭时扬在脚下先护住自己。
 * 为什么值得先手：沙幕按趟磨掉无岩土护体者的生命、把身体往外推，岩石之躯还能借它提高特防；所以
 * 对手越多、越靠近时越值得早放——周围敌人达到 2 个以上时 priority 抬到 62，否则 46，接在 `world_combat:defend` 之前。
 * 放完之后把伤害交回共用交战计划；还站在沙幕里时不再重复。
 */
namespace CompanionBehavior {
    const sandstormChase = PokemonSkills.number("ai.maxChase", "扬沙距离", 2, 24, 1);
    sandstormChase.help = "伙伴只在威胁离自己这么远以内时才考虑沙暴；调小只在贴身时扬沙，调大愿意提前布置。";
    const sandstormAdvance = PokemonSkills.flag("ai.advance", "把沙幕压向对手");
    sandstormAdvance.help = "开启后把沙幕扬在自己与威胁之间，让交战区落进沙里；关闭则扬在脚下先护住自己。";

    PokemonSkills.addPreferences("sandstorm", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [sandstormChase, sandstormAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function sandstormCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "sandstorm") return items[i];
        return null;
    }
    function sandstormInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.sandstormField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function sandstormCrowd(context: WorldBehavior.Context): number {
        const self = source(context);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return other.health > 0 && other.visible && !other.friendly && distance(other.point, self.point) <= 16;
        }).length;
    }
    function sandstormWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !sandstormInside(context);
    }

    registerUse("sandstorm", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) { return sandstormCrowd(context) >= 2 ? 62 : 46; },
        available: function (context, item, _purpose, _target) { return sandstormWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_sandstorm/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = sandstormCapability(context);
            if (!item || !sandstormWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_sandstorm:" + threat.ref, kind: "world_combat:move_sandstorm", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_sandstorm/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_sandstorm") return [];
            const item = sandstormCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !sandstormWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_sandstorm/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_sandstorm");
    });
}
