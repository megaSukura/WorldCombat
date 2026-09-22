/**
 * 重力 / gravity 的伙伴 AI 用途与自己的排场计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，自己还不在重力井里。`ai.airOnly` 打开时只对
 * 离地/会飞/浮空的威胁出手（把这一口井留给真正需要压下来的人）；关闭时也当开打前的场地布置。
 * 威胁离地时 priority 抬到 62——这是它唯一不可替代的用途；否则 40，插在 `world_combat:defend` 之前。
 * `ai.atFoe` 决定井压在威胁身上（默认）还是压在自己脚下先护住自己。
 */
namespace PokemonSkills {
    function gravityCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === gravityId) return items[i];
        return null;
    }
    function gravityInside(context: WorldBehavior.Context): boolean {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const areas = WorldEffects.areas(access, gravityField);
        for (let i = 0; i < areas.length; i++) if (CompanionBehavior.distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function gravityAirborne(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.grounded === false) return true;
        const facts = target.facts;
        if (facts && Array.isArray(facts.types) && facts.types.indexOf("flying") >= 0) return true;
        return CompanionBehavior.status(context, target, "fly") || CompanionBehavior.status(context, target, "bounce")
            || CompanionBehavior.status(context, target, "magnetrise") || CompanionBehavior.status(context, target, "telekinesis");
    }
    function gravityWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (CompanionBehavior.ai<boolean>(item, "airOnly", false) && !gravityAirborne(context, threat)) return false;
        return !gravityInside(context);
    }

    CompanionBehavior.registerUse(gravityId, {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            return threat && gravityAirborne(context, threat) ? 62 : 40;
        },
        available: function (context, item, _purpose, _target) {
            return gravityWants(context, item, context.senses["world_combat:threat"]);
        }
    });
    CompanionBehavior.registry.goal({ id: "world_combat:move_gravity/goal", propose: function (context) {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = gravityCapability(context);
        if (!item || !gravityWants(context, item, threat)) return [];
        return [{ id: "world_combat:move_gravity:" + threat.ref, kind: "world_combat:move_gravity", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_gravity/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_gravity") return [];
            const item = gravityCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !gravityWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return CompanionBehavior.castNode(item.id, "prepare", function (current) {
                const self = CompanionBehavior.source(current), threat: CompanionBehavior.Entity | null = current.senses["world_combat:threat"];
                const found = CompanionBehavior.ai<boolean>(item, "atFoe", true) && threat ? CompanionBehavior.entity(current, threat.ref) : null;
                return JSON.parse(JSON.stringify(found || self));
            });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_gravity/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_gravity");
    });

    addPreferences(gravityId, { ai: { maxChase: 14, airOnly: false, atFoe: true, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "压井距离", "number", { min: 4, max: 24, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才压重力井；调小只在贴身时压，调大愿意提前布置。" }),
        field(pathOf("ai.airOnly"), "只压制空中的", "boolean",
            { help: "开启：只有威胁离地、会飞或浮空时才压井，把这一口井留给真正需要压下来的目标。关闭：也当前置场地用，任何威胁都压。" }),
        field(pathOf("ai.atFoe"), "把井压在对手身上", "boolean",
            { help: "开启：重力井压在威胁的位置，把它和身边的东西一起拽下来。关闭：压在自己脚下先护住自己。" }),
        field(pathOf("ai.leaveStation"), "离开驻守点", "boolean",
            { help: "开启后，驻守中的伙伴会离开原位去压重力井。" })
    ]);
}
