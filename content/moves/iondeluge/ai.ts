/**
 * 等离子浴 / Ion Deluge — 伙伴 AI 用途与自己的出手计划。
 *
 * 浴场是区域铺场，收益与风险都在「铺在哪」：
 *   何时考虑  有 threat 在 ai.maxChase 之内、这招就绪、自己目前没站在已有的离子浴里（不浪费）。
 *   铺在哪    ai.placement = towardThreat 时压在对手与自己之间，让交战线落在浴场里；
 *             underSelf 时罩住自己，适合自己要用一般属性招式、或想把安全区放在脚下。
 *   对谁出手  地面一点；由共用任务走到 reach 后按 choice 的落点施放。
 *   放完之后  区域内双方都会被电离，随后把伤害交回共用交战计划；自己站在浴里时不再重复铺。
 *   优先级    插在 world_combat:defend 之前，让它作为开打前的场地准备。
 * ai.leaveStation：驻守中的伙伴是否愿意离位去铺场。
 */
namespace CompanionBehavior {
    const ionChase = PokemonSkills.number("ai.maxChase", "铺场距离", 2, 24, 1);
    ionChase.help = "伙伴只在威胁离自己这么远以内时才考虑铺等离子浴；调小只在贴身时铺，调大愿意提前布置。";
    const ionPlacement = PokemonSkills.choice("ai.placement", "铺场位置", ["towardThreat", "underSelf"], ["压向对手", "罩住自己"]);
    ionPlacement.help = "「压向对手」把浴场铺在自己与威胁之间，让交战线落在里面；「罩住自己」则铺在脚下，先保住自己的普通招。";
    const ionLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    ionLeave.help = "开启后，驻守中的伙伴会离开原位去铺等离子浴。";

    PokemonSkills.addPreferences("iondeluge", { ai: { maxChase: 12, placement: "towardThreat", leaveStation: false } },
        [ionChase, ionPlacement, ionLeave]);

    function ionCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "iondeluge") return items[i];
        return null;
    }
    /** Standing in an existing ion bath makes this cast pointless. */
    function ionInsideField(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.ionField);
        for (let i = 0; i < areas.length; i++)
            if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function ionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        return !ionInsideField(context);
    }

    registerUse("iondeluge", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function () { return 55; },
        available: function (context, item, _purpose, _target) { return ionWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_iondeluge/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = ionCapability(context);
            if (!item || !ionWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_iondeluge:" + threat.ref, kind: "world_combat:move_iondeluge", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_iondeluge/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_iondeluge") return [];
            const item = ionCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !ionWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            const placement = ai<string>(item, "placement", "towardThreat");
            return castNode(item.id, "prepare", function (current) {
                const self = source(current);
                const copy: Entity = JSON.parse(JSON.stringify(self));
                const threat: Entity | null = current.senses["world_combat:threat"];
                if (placement === "towardThreat" && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2.5, length * 0.5);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_iondeluge/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_iondeluge");
    });
}
