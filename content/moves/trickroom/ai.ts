/**
 * 戏法空间 / trickroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在任何戏法空间里时出手。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下，先让自己被扭；开启时前压到交战区中间，
 *   把空间按在自己与威胁之间，让双方一起被扭。
 * 候选之间怎么排：自己速度越低排得越前（基准 46，速度每低于 80 一点 +0.3，封顶 70）——
 *   这招是给慢速单位抢进位的；只剩本招可选时仍会按共享顺序落地。
 * 放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。配置 turn（强扭／缓扭）改变幅度、时长与冷却。
 */
namespace CompanionBehavior {
    const trickRoomChase = PokemonSkills.number("ai.maxChase", "扭转距离", 2, 24, 1);
    trickRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑戏法空间；调小只在贴身时按，调大愿意提前布置。";
    const trickRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    trickRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被扭；关闭则按在脚下先让自己被扭。";

    PokemonSkills.addPreferences("trickroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [trickRoomChase, trickRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function trickRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "trickroom") return items[i];
        return null;
    }
    function trickRoomInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.trickRoomField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function trickRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        return !trickRoomInside(context);
    }
    function trickRoomPriority(context: WorldBehavior.Context): number {
        const speed = Number(context.facts.speed) || 80;
        return Math.max(30, Math.min(70, 46 + (80 - speed) * 0.3));
    }

    registerUse("trickroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: trickRoomPriority,
        available: function (context, item, _purpose, _target) { return trickRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_trickroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = trickRoomCapability(context);
            if (!item || !trickRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_trickroom:" + threat.ref, kind: "world_combat:move_trickroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_trickroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_trickroom") return [];
            const item = trickRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !trickRoomWants(context, item, threat)) return [];
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
    orderGoals("world_combat:move_trickroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_trickroom");
    });
}
