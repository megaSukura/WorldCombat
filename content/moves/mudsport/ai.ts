/**
 * 玩泥巴 / mudsport 的伙伴 AI 用途与自己的铺泥计划。
 *
 * 只认确知的电属性招式／伤害信息：宝可梦的已配招式里有电属性招式，或最近 10 秒内真的打出过电属性伤害，
 * 才算「会电攻」。不因为看不见电系就假定对手的输出都是电，也不靠属性猜。对手确知电攻时 priority 58，
 * 其余不该由本招兜底（40 只是排位基准，`mudsportWants` 仍要求确知电攻）。己方（含自己）也靠电攻时降到 30——泥滩压
 * 电对双方一视同仁，别把自家电输出一起压掉。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、已确知会用电攻、自己还不在泥滩里。
 * `ai.advance` 开启时把泥滩压到威胁脚下（压住已观测电攻的站位）；关闭时按在脚下先护住自己与队伍。
 */
namespace PokemonSkills {
    /** 观测记忆：最近一次看到某个 ref 打出电属性伤害的 tick。 */
    var mudsportElectricSeen: { [ref: string]: number } = {};
    WorldCombat.on("world_combat:move_mudsport/electric-seen", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor();
        if (!world || !actor) return;
        var data: any;
        try { data = JSON.parse(String(event.data() || "{}")); } catch (error) { return; }
        if (!(data.actual > 0) || String(data.type).toLowerCase() !== "electric") return;
        const now = world.tick();
        Object.keys(mudsportElectricSeen).forEach(function (ref) { if (now - mudsportElectricSeen[ref] > 400) delete mudsportElectricSeen[ref]; });
        mudsportElectricSeen[String(actor.ref())] = now;
    });
    /** 只读事实：这个活体是否有确知的电属性进攻（已配电招，或最近观测到电属性伤害）。 */
    CompanionBehavior.registerFact("world_combat:move_mudsport/electric-offense", function (access, actor, _argument) {
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor);
            if (pokemon !== null) for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                const move = pokemon.move(slot);
                if (move !== null && String(move.type()).toLowerCase() === "electric") return true;
            }
        }
        const seen = mudsportElectricSeen[String(actor.ref())];
        return typeof seen === "number" && access.tick() - seen <= 200;
    });
    function mudsportElectric(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return !!CompanionBehavior.fact<boolean>(context, "world_combat:move_mudsport/electric-offense", target);
    }
    function mudsportAllyElectric(context: WorldBehavior.Context): boolean {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (var i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (mudsportElectric(context, other)) return true;
        }
        return mudsportElectric(context, CompanionBehavior.source(context));
    }
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
    function mudsportWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        if (!mudsportElectric(context, threat)) return false;
        return !mudsportInside(context);
    }

    CompanionBehavior.registerUse(mudsportId, {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            const base = threat && mudsportElectric(context, threat) ? 58 : 40;
            return mudsportAllyElectric(context) ? Math.min(base, 30) : base;
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

    addPreferences(mudsportId, { ai: { maxChase: 13, advance: false, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "铺泥距离", "number", { min: 4, max: 22, step: 1,
            help: "伙伴只在已确知电攻的威胁离自己这么远以内时才铺泥；调小只在贴身时铺，调大愿意提前布置。" }),
        field(pathOf("ai.advance"), "把泥滩压向电攻站位", "boolean",
            { help: "开启：把泥滩压到已确知电攻的对手脚下，压住他的电输出；关闭：按在脚下先护住自己与队伍。" }),
        field(pathOf("ai.leaveStation"), "离开驻守点", "boolean",
            { help: "开启后，驻守中的伙伴会离开原位去铺泥。" })
    ]);
}
