/**
 * 魔法空间 / magicroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在静默空间里时出手。
 * 候选之间怎么排：自己没带道具时排得更前（自己不受损，+10），带着道具时靠后（−6）；
 *   对手带着道具再 +8——静默正是冲着对手的携带物去的（基准 42，夹 28..66）。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先默自己这边；开启时前压到交战区中间，让双方一起被默。
 * 放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。配置 hush（长默／快默）改变半径、时长与节奏。
 */
namespace CompanionBehavior {
    const magicRoomChase = PokemonSkills.number("ai.maxChase", "静默距离", 2, 24, 1);
    magicRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑魔法空间；调小只在贴身时按，调大愿意提前布置。";
    const magicRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    magicRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被默；关闭则按在脚下先默住自己这边。";

    PokemonSkills.addPreferences("magicroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [magicRoomChase, magicRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    CompanionBehavior.registerFact("world_combat:move_magicroom/held", function (_access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (String(actor.domain()) !== "cobblemon") return "";
        return String(CobblemonCombat.pokemon(actor).heldItem()).replace("cobblemon:", "");
    });

    function magicRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "magicroom") return items[i];
        return null;
    }
    function magicRoomInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.magicRoomField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function magicRoomHeld(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_magicroom/held", target) || "";
    }
    function magicRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        return !magicRoomInside(context);
    }
    function magicRoomPriority(context: WorldBehavior.Context): number {
        let score = 42 + (magicRoomHeld(context, source(context)) ? -6 : 10);
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (threat && magicRoomHeld(context, threat)) score += 8;
        return Math.max(28, Math.min(66, score));
    }

    registerUse("magicroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: magicRoomPriority,
        available: function (context, item, _purpose, _target) { return magicRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_magicroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = magicRoomCapability(context);
            if (!item || !magicRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_magicroom:" + threat.ref, kind: "world_combat:move_magicroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_magicroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_magicroom") return [];
            const item = magicRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !magicRoomWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_magicroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_magicroom");
    });
}
