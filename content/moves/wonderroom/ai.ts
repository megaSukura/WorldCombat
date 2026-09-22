/**
 * 奇妙空间 / wonderroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在交换空间里时出手。
 * 候选之间怎么排：自己的「特防 − 防御」越大排得越前（基准 46，每差 1 点 +0.3，夹 30..68）——
 *   对调把高特防换到物理侧，对偏特防的身板收益最大；只剩本招可选时仍按共享顺序落地。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先换自己；开启时前压到交战区中间，让双方一起被换。
 * 放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。配置 span（广域／紧凑）改变半径、时长与节奏。
 */
namespace CompanionBehavior {
    const wonderRoomChase = PokemonSkills.number("ai.maxChase", "交换距离", 2, 24, 1);
    wonderRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑奇妙空间；调小只在贴身时按，调大愿意提前布置。";
    const wonderRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    wonderRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被换；关闭则按在脚下先换自己。";

    PokemonSkills.addPreferences("wonderroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [wonderRoomChase, wonderRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    CompanionBehavior.registerFact("world_combat:move_wonderroom/stats", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (String(actor.domain()) !== "cobblemon") return null;
        const pokemon = CobblemonCombat.pokemon(actor);
        return { def: pokemon.stat("def"), spd: pokemon.stat("spd") };
    });

    function wonderRoomStats(context: WorldBehavior.Context): { def: number; spd: number } | null {
        return CompanionBehavior.fact<{ def: number; spd: number }>(context, "world_combat:move_wonderroom/stats", source(context));
    }
    function wonderRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "wonderroom") return items[i];
        return null;
    }
    function wonderRoomInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.wonderRoomField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function wonderRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        return !wonderRoomInside(context);
    }
    function wonderRoomPriority(context: WorldBehavior.Context): number {
        const stats = wonderRoomStats(context);
        if (!stats) return 44;
        return Math.max(30, Math.min(68, 46 + (stats.spd - stats.def) * 0.3));
    }

    registerUse("wonderroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: wonderRoomPriority,
        available: function (context, item, _purpose, _target) { return wonderRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_wonderroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = wonderRoomCapability(context);
            if (!item || !wonderRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_wonderroom:" + threat.ref, kind: "world_combat:move_wonderroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_wonderroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_wonderroom") return [];
            const item = wonderRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !wonderRoomWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_wonderroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_wonderroom");
    });
}
