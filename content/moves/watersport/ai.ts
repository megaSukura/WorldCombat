/**
 * 玩水 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：自己或附近有活体在燃烧（priority 抬到 72，先灭火救人），或存在火属性威胁 / 燃烧中的敌人；
 *   ai.fireOnly 关闭时见威胁也可能铺水当常备压制。ai.maxChase 决定愿意在多远处开铺。
 * 出手前的位置：ai.advance 关闭（默认）时按在脚下护住自己；开启时前压到交战区中间，把对手罩进洼里。
 * 放完之后把伤害交回共用交战计划；自己还湿着时不再重复（水洼也在持续生效）。
 */
namespace CompanionBehavior {
    const watersportChase = PokemonSkills.number("ai.maxChase", "铺水距离", 2, 24, 1);
    watersportChase.help = "伙伴只在威胁离自己这么远以内时才考虑铺水；调小只在贴身时铺，调大愿意提前布置。";
    const watersportAdvance = PokemonSkills.flag("ai.advance", "把水洼泼向对手");
    watersportAdvance.help = "开启后把水洼按在自己与威胁之间，让交战区泡湿；关闭则按在脚下先护住自己。";
    const watersportFireOnly = PokemonSkills.flag("ai.fireOnly", "只在有火时铺水");
    watersportFireOnly.help = "开启时只在有火属性威胁、或附近有活体在燃烧时才铺水；关闭则把水洼当作常备压制。";
    const watersportStation = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    watersportStation.help = "开启后，收到「驻守」指令时也会离开原位去铺水。";

    PokemonSkills.addPreferences("watersport", { ai: { maxChase: 12, advance: false, fireOnly: true, leaveStation: false } },
        [watersportChase, watersportAdvance, watersportFireOnly, watersportStation]);

    function watersportBurning(context: WorldBehavior.Context, self: Entity): boolean {
        if (status(context, self, "burn")) return true;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health > 0 && status(context, other, "burn")) return true;
        }
        return false;
    }
    function watersportFireThreat(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = pokemonFacts(context, threat);
        if (facts && facts.types && facts.types.indexOf("fire") >= 0) return true;
        return status(context, threat, "burn");
    }
    function watersportWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (status(context, self, "watersport")) return false;
        if (watersportBurning(context, self)) return true;
        const fire = !!threat && threat.health > 0 && threat.visible && !threat.friendly && watersportFireThreat(context, threat);
        if (ai<boolean>(item, "fireOnly", true) && !fire) return false;
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        return true;
    }
    function watersportCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "watersport") return items[i];
        return null;
    }

    registerUse("watersport", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            if (watersportBurning(context, source(context))) return 72;
            return watersportFireThreat(context, context.senses["world_combat:threat"]) ? 50 : 38;
        },
        available: function (context, item, _purpose, _target) { return watersportWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_watersport/goal", propose: function (context) {
        const threat: Entity | null = context.senses["world_combat:threat"];
        const item = watersportCapability(context);
        if (!item || !watersportWants(context, item, threat)) return [];
        const anchor = threat && threat.health > 0 ? threat : source(context);
        return [{ id: "world_combat:move_watersport:" + anchor.ref, kind: "world_combat:move_watersport", data: { ref: anchor.ref } }];
    } });
    registry.method({ id: "world_combat:move_watersport/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_watersport") return [];
            const item = watersportCapability(context), threat: Entity | null = entity(context, goal.data.ref);
            if (!item || !watersportWants(context, item, threat && threat.ref !== source(context).ref ? threat : null)) return [];
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
    orderGoals("world_combat:move_watersport/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_watersport");
    });
}
