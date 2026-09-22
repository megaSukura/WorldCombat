/**
 * 精神场地 / psychicterrain 的伙伴 AI 用途与自己的铺场计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，自己还不在精神域里。威胁已经逼近到 4 格内时
 * priority 抬到 58——先制招式随时会到，护场最值钱；否则 42，插在 `world_combat:defend` 之前当作开打前的布置。
 * `ai.advance` 开启时把精神域按在威胁与我方之间。
 */
namespace PokemonSkills {
    function psychicCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === psychicterrainId) return items[i];
        return null;
    }
    function psychicInside(context: WorldBehavior.Context): boolean {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const areas = WorldEffects.areas(access, psychicterrainField);
        for (let i = 0; i < areas.length; i++) if (CompanionBehavior.distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function psychicWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        return !psychicInside(context);
    }
    function psychicClose(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) <= 4;
    }

    CompanionBehavior.registerUse(psychicterrainId, {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            return threat && psychicClose(context, threat) ? 58 : 42;
        },
        available: function (context, item, _purpose, _target) {
            return psychicWants(context, item, context.senses["world_combat:threat"]);
        }
    });
    CompanionBehavior.registry.goal({ id: "world_combat:move_psychicterrain/goal", propose: function (context) {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = psychicCapability(context);
        if (!item || !psychicWants(context, item, threat)) return [];
        return [{ id: "world_combat:move_psychicterrain:" + threat.ref, kind: "world_combat:move_psychicterrain", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_psychicterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_psychicterrain") return [];
            const item = psychicCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !psychicWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return CompanionBehavior.castNode(item.id, "prepare", function (current) {
                const self = CompanionBehavior.source(current), threat: CompanionBehavior.Entity | null = current.senses["world_combat:threat"];
                const found = CompanionBehavior.ai<boolean>(item, "advance", false) && threat ? CompanionBehavior.entity(current, threat.ref) : null;
                return JSON.parse(JSON.stringify(found || self));
            });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_psychicterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_psychicterrain");
    });

    addPreferences(psychicterrainId, { ai: { maxChase: 14, advance: false, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "铺场距离", "number", { min: 4, max: 24, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才铺精神域；调小只在贴身时铺，调大愿意提前布置。" }),
        field(pathOf("ai.advance"), "把场推向对手", "boolean",
            { help: "开启：精神域按在自己与威胁之间，护住交战区。关闭：按在脚下先护住自己。" }),
        field(pathOf("ai.leaveStation"), "离开驻守点", "boolean",
            { help: "开启后，驻守中的伙伴会离开原位去铺精神域。" })
    ]);
}
