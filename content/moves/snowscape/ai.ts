/**
 * 雪景 / snowscape 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片雪区里。
 * 出手前的位置：`ai.advance` 开启（默认）时把雪区铺在自己与威胁之间；关闭时铺在脚下。
 * 什么时候最想出手：雪景护冰之躯——自己带冰属性时 priority 抬到 58，附近队友带冰属性时也抬；
 *   否则 42，当作改变地面、为冰招与走位做准备的布置。接在 `world_combat:defend` 之前。
 * 放完之后把伤害交回共用交战计划；还站在雪区里时不再重复。
 */
namespace CompanionBehavior {
    const snowscapeChase = PokemonSkills.number("ai.maxChase", "落雪距离", 2, 24, 1);
    snowscapeChase.help = "伙伴只在威胁离自己这么远以内时才考虑雪景；调小只在贴身时落雪，调大愿意提前布置。";
    const snowscapeAdvance = PokemonSkills.flag("ai.advance", "把雪区铺向对手");
    snowscapeAdvance.help = "开启后把雪区铺在自己与威胁之间，让交战区落进雪里；关闭则铺在脚下先护住自己。";

    PokemonSkills.addPreferences("snowscape", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [snowscapeChase, snowscapeAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function snowscapeCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "snowscape") return items[i];
        return null;
    }
    function snowscapeInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.snowscapeField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function snowscapeIce(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("ice") >= 0;
    }
    function snowscapeFriendlyIce(context: WorldBehavior.Context): boolean {
        const self = source(context);
        if (snowscapeIce(context, self)) return true;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) if (nearby[i].friendly && nearby[i].health > 0 && snowscapeIce(context, nearby[i])) return true;
        return false;
    }
    function snowscapeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !snowscapeInside(context);
    }

    registerUse("snowscape", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) { return snowscapeFriendlyIce(context) ? 58 : 42; },
        available: function (context, item, _purpose, _target) { return snowscapeWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_snowscape/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = snowscapeCapability(context);
            if (!item || !snowscapeWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_snowscape:" + threat.ref, kind: "world_combat:move_snowscape", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_snowscape/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_snowscape") return [];
            const item = snowscapeCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !snowscapeWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_snowscape/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_snowscape");
    });
}
