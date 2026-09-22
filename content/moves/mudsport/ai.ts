/**
 * 玩泥巴 / mudsport 的伙伴 AI 用途与自己的铺泥计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内，自己还不在泥滩里。`ai.electricOnly` 打开时只对
 * 电属性的威胁铺泥（把这一片留给真正被压的电招）；关闭时也当开打前的场地布置。威胁带电属性时 priority
 * 抬到 58，其余 40，插在 `world_combat:defend` 之前。`ai.advance` 开启时把泥滩按在威胁身上。
 */
namespace PokemonSkills {
    function mudsportCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === mudsportId) return items[i];
        return null;
    }
    function mudsportInside(context: WorldBehavior.Context): boolean {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const areas = WorldEffects.areas(access, mudsportField);
        for (let i = 0; i < areas.length; i++) if (CompanionBehavior.distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function mudsportElectric(target: CompanionBehavior.Entity): boolean {
        const facts = target.facts;
        return !!(facts && Array.isArray(facts.types) && facts.types.indexOf("electric") >= 0);
    }
    function mudsportWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        if (CompanionBehavior.ai<boolean>(item, "electricOnly", false) && !mudsportElectric(threat)) return false;
        return !mudsportInside(context);
    }

    CompanionBehavior.registerUse(mudsportId, {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            return threat && mudsportElectric(threat) ? 58 : 40;
        },
        available: function (context, item, _purpose, _target) {
            return mudsportWants(context, item, context.senses["world_combat:threat"]);
        }
    });
    CompanionBehavior.registry.goal({ id: "world_combat:move_mudsport/goal", propose: function (context) {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = mudsportCapability(context);
        if (!item || !mudsportWants(context, item, threat)) return [];
        return [{ id: "world_combat:move_mudsport:" + threat.ref, kind: "world_combat:move_mudsport", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_mudsport/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_mudsport") return [];
            const item = mudsportCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !mudsportWants(context, item, threat)) return [];
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
    CompanionBehavior.orderGoals("world_combat:move_mudsport/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_mudsport");
    });

    addPreferences(mudsportId, { ai: { maxChase: 13, electricOnly: false, advance: false, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "铺泥距离", "number", { min: 4, max: 22, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才铺泥；调小只在贴身时铺，调大愿意提前布置。" }),
        field(pathOf("ai.electricOnly"), "只对电属性的对手铺", "boolean",
            { help: "开启：只有威胁带电属性时才铺泥，把这一片留给真正被压的电招。关闭：也当前置场地用，任何威胁都铺。" }),
        field(pathOf("ai.advance"), "把泥滩推向对手", "boolean",
            { help: "开启：泥滩按在自己与威胁之间，让交战区糊上泥。关闭：按在脚下先护住自己。" }),
        field(pathOf("ai.leaveStation"), "离开驻守点", "boolean",
            { help: "开启后，驻守中的伙伴会离开原位去铺泥。" })
    ]);
}
