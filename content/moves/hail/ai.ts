/**
 * 冰雹 / hail 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片雹区里。
 * 出手前的位置：`ai.advance` 开启（默认）时把雹区压在自己与威胁之间；关闭时压在脚下。
 * 什么时候最想出手：这一招只砸非冰之躯——威胁不是冰属性时 priority 抬到 58，是冰属性时降到 40；
 *   威胁头顶露天再 +8（有顶棚的砸不到，优先留给能砸的），自身带冰属性 +6（免疫反而是净赚）。
 *   计划落点附近有非冰友方时大幅降权，避免把队友罩进雹里。
 * 放完之后把伤害交回共用交战计划；还站在雹区里时不再重复。
 */
namespace CompanionBehavior {
    const hailChase = PokemonSkills.number("ai.maxChase", "落雹距离", 2, 24, 1);
    hailChase.help = "伙伴只在威胁离自己这么远以内时才考虑冰雹；调小只在贴身时落雹，调大愿意提前布置。";
    const hailAdvance = PokemonSkills.flag("ai.advance", "把雹区压向对手");
    hailAdvance.help = "开启后把雹区压在自己与威胁之间，让交战区落进雹里；关闭则压在脚下先护住自己。";

    PokemonSkills.addPreferences("hail", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [hailChase, hailAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function hailCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "hail") return items[i];
        return null;
    }
    function hailInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.hailField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function hailIce(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("ice") >= 0;
    }
    /** 威胁正上方到雹云没有实心遮挡：雹子砸得到，优先。 */
    function hailOpen(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context);
        const actor = access.actor(target.ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return false;
        const head = WorldCombat.point(target.point[0], target.point[1] + body.height() / 2 + 0.2, target.point[2]);
        return access.clear(head, WorldCombat.point(head.x(), head.y() + 24, head.z()));
    }
    /** 计划落点附近、会被一起罩住的非冰友方数量；雹子对它们只有害处。 */
    function hailBystanders(context: WorldBehavior.Context, at: number[]): number {
        const nearby = (context.facts.nearby || []) as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === source(context).ref || !other.friendly || other.health <= 0) continue;
            if (distance(other.point, at) > 6) continue;
            if (!hailIce(context, other)) count++;
        }
        return count;
    }
    function hailWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !hailInside(context);
    }

    registerUse("hail", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            const threat: Entity | null = target || context.senses["world_combat:threat"];
            const self = source(context);
            if (!threat) return 0;
            let value = hailIce(context, threat) ? 40 : 58;
            if (!hailIce(context, threat) && hailOpen(context, threat)) value += 8;
            if (hailIce(context, self)) value = Math.min(100, value + 6);
            if (hailBystanders(context, threat.point) > 0) value = Math.max(0, value - 18);
            return value;
        },
        available: function (context, item, _purpose, _target) { return hailWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_hail/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = hailCapability(context);
            if (!item || !hailWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_hail:" + threat.ref, kind: "world_combat:move_hail", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_hail/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_hail") return [];
            const item = hailCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !hailWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", true) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
                    // 落点附近有非冰友方时，把雹区往威胁一侧收，别把队友一起罩住。
                    const share = hailBystanders(current, threat.point) > 0 ? 0.7 : 0.5;
                    const step = Math.min(3, length * share);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_hail/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_hail");
    });
}
