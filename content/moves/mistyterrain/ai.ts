/**
 * 薄雾场地 / mistyterrain 的伙伴 AI 用途与自己的漫雾计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，自己还不在薄雾里。开启净化雾且队友（含自己）
 * 带着可清的有害状态时 priority 抬到 62——雾把异常洗掉，落点也按在那个队友身上，净化价值最高；威胁带龙属性
 * 时 56——薄雾削掉它的龙招；其余 40。插在 `world_combat:defend` 之前当作开打前的布置，`ai.advance` 开启时把
 * 薄雾按向威胁。
 *
 * 己方依赖异常进攻（读得到的宝可梦招式里有对敌的变化招）时避用：薄雾连同队友的异常施加一起挡掉。唯一的例外
 * 是净化雾正要去救一个已经中异常的队友——救人优先，洗完仍按正常防异常。净化只在首次进入本次雾时清一次。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_mistyterrain/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    /** 只读事实：这个活体是否有对敌的变化招（可能的上异常来源）；非宝可梦未知返回 false。 */
    CompanionBehavior.registerFact("world_combat:move_mistyterrain/status-offense", function (_access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        if (pokemon === null) return false;
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null || String(move.category()) !== "status" || String(move.target()) === "self") continue;
            var data: any = {};
            try { data = JSON.parse(String(move.metadata())); } catch (error) { continue; }
            if (data && (data.status || data.volatileStatus)) return true;
        }
        return false;
    });
    function mistyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === mistyterrainId) return items[i];
        return null;
    }
    function mistyInside(context: WorldBehavior.Context): boolean {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const areas = WorldEffects.areas(access, mistyterrainField);
        for (let i = 0; i < areas.length; i++) if (CompanionBehavior.distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function mistyPurify(item: WorldBehavior.Capability): boolean {
        return !!(item.data.config && item.data.config.purify);
    }
    /** 第一个带着有害状态、可被净化救回的友方（含自己），没有则 null。 */
    function mistyStatusedAlly(context: WorldBehavior.Context): CompanionBehavior.Entity | null {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.fact<boolean>(context, "world_combat:move_mistyterrain/harmful", self)) return self;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:move_mistyterrain/harmful", other)) return other;
        }
        return null;
    }
    function mistyAllyStatusOffense(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.fact<boolean>(context, "world_combat:move_mistyterrain/status-offense", self)) return true;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:move_mistyterrain/status-offense", other)) return true;
        }
        return false;
    }
    function mistyDragon(target: CompanionBehavior.Entity): boolean {
        const facts = target.facts;
        return !!(facts && Array.isArray(facts.types) && facts.types.indexOf("dragon") >= 0);
    }
    function mistyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (mistyAllyStatusOffense(context) && !(mistyPurify(item) && mistyStatusedAlly(context) !== null)) return false;
        return !mistyInside(context);
    }

    CompanionBehavior.registerUse(mistyterrainId, {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (mistyPurify(item) && mistyStatusedAlly(context)) return 62;
            return threat && mistyDragon(threat) ? 56 : 40;
        },
        available: function (context, item, _purpose, _target) {
            return mistyWants(context, item, context.senses["world_combat:threat"]);
        }
    });
    CompanionBehavior.registry.goal({ id: "world_combat:move_mistyterrain/goal", propose: function (context) {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = mistyCapability(context);
        if (!item || !mistyWants(context, item, threat)) return [];
        return [{ id: "world_combat:move_mistyterrain:" + threat.ref, kind: "world_combat:move_mistyterrain", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_mistyterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_mistyterrain") return [];
            const item = mistyCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !mistyWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return CompanionBehavior.castNode(item.id, "prepare", function (current) {
                const self = CompanionBehavior.source(current), threat: CompanionBehavior.Entity | null = current.senses["world_combat:threat"];
                // 净化雾优先罩住正需要救回的队友（净化价值最高的落点），否则前压威胁或按在脚下。
                const rescue = mistyPurify(item) ? mistyStatusedAlly(current) : null;
                const found = rescue || (CompanionBehavior.ai<boolean>(item, "advance", false) && threat ? CompanionBehavior.entity(current, threat.ref) : null);
                return JSON.parse(JSON.stringify(found || self));
            });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_mistyterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_mistyterrain");
    });

    addPreferences(mistyterrainId, { ai: { maxChase: 14, advance: false, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "漫雾距离", "number", { min: 4, max: 24, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才铺薄雾；调小只在贴身时铺，调大愿意提前布置。" }),
        field(pathOf("ai.advance"), "把雾推向对手", "boolean",
            { help: "开启：薄雾按在自己与威胁之间，护住交战区。关闭：按在脚下先护住自己。净化雾遇到中异常的队友时会优先罩住队友。" }),
        field(pathOf("ai.leaveStation"), "离开驻守点", "boolean",
            { help: "开启后，驻守中的伙伴会离开原位去铺薄雾。" })
    ]);
}
