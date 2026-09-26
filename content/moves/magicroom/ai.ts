/**
 * 魔法空间 / magicroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在静默空间里，
 *   且落点范围内敌人的「可压制装备收益」确实高过自己一侧时才出手。没有任何可压制装备就不自动放。
 * 收益怎么判：从原生装备快照读——宝可梦的携带物算一件；原版/模组装备槽按 ItemStack 是否声明了
 *   minecraft:attribute_modifiers 计件。这正是 world.suppressEquipment 会暂停的属性增益与
 *   suppressItems 会封住的携带物效果，所以 AI 不会对着空手/无可压制装备的目标浪费。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先默自己这边；开启时前压到交战区 40% 处，
 *   让双方一起被默。放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。
 * 配置 hush（长默／快默）改变半径、时长与节奏。
 */
namespace CompanionBehavior {
    const magicRoomChase = PokemonSkills.number("ai.maxChase", "静默距离", 2, 24, 1);
    magicRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑魔法空间；调小只在贴身时按，调大愿意提前布置。";
    const magicRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    magicRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被默；关闭则按在脚下先默住自己这边。";

    PokemonSkills.addPreferences("magicroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [magicRoomChase, magicRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    // 注册事实：该对象当前有多少件真正会被压制的装备（携带物一件，或声明了属性修饰的装备槽）。
    CompanionBehavior.registerFact("world_combat:move_magicroom/gear", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (!access.valid(actor)) return 0;
        const entries = access.equipment(actor);
        let pieces = 0;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.count() <= 0) continue;
            if (String(entry.provider()) === "cobblemon" && String(entry.slot()) === "held") { pieces += 1; continue; }
            const stack = entry.stack();
            if (stack === null || !stack.hasComponent("minecraft:attribute_modifiers")) continue;
            let modifiers = 0;
            try {
                const component = stack.component("minecraft:attribute_modifiers");
                const parsed = component === null ? null : JSON.parse(component);
                modifiers = parsed && parsed.modifiers ? parsed.modifiers.length : 0;
            } catch (error) { modifiers = 0; }
            if (modifiers > 0) pieces += 1;
        }
        return pieces;
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
    function magicRoomGear(context: WorldBehavior.Context, subject: Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_magicroom/gear", subject);
        return typeof value === "number" && isFinite(value) && value > 0 ? value : 0;
    }
    function magicRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (magicRoomInside(context)) return false;
        const enemy = magicRoomGear(context, threat);
        return enemy > 0 && enemy > magicRoomGear(context, source(context));
    }
    function magicRoomPriority(context: WorldBehavior.Context): number {
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat) return 0;
        const enemy = magicRoomGear(context, threat);
        if (enemy <= 0) return 0;
        const own = magicRoomGear(context, source(context));
        return Math.max(28, Math.min(74, 44 + (enemy - own) * 4));
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
