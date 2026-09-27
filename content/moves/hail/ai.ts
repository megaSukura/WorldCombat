/**
 * 冰雹 / hail 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片（自己或友方的）雹区里。
 * 出手前的位置：`ai.advance` 开启（默认）时把雹区压在自己与威胁之间；关闭时压在脚下。
 * 什么时候最想出手：这一招只砸非冰之躯——威胁不是冰属性时 priority 抬到 58，是冰属性时降到 40；
 *   威胁头顶露天再 +8（有顶棚的砸不到，优先留给能砸的），自身带冰属性 +6（免疫反而是净赚）。
 *   再按实际雹区半径对计划落点算一遍净收益：会被真正砸到的非冰友方（含自己）大幅降权，被罩住的敌人加权，
 *   屋檐下的活体两边都不计。放完之后把伤害交回共用交战计划；还站在雹区里时不再重复。
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
    /** 自己或友方已经拥有的雹区算「已在雹里」；敌方的同类场不算。 */
    function hailInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.hailField);
        for (let i = 0; i < areas.length; i++) {
            if (distance(areas[i].position, self.point) > areas[i].radius) continue;
            const owner = access.actor(areas[i].source);
            if (owner !== null && access.friendly(owner)) return true;
        }
        return false;
    }
    /** 共享战斗者类型：宝可梦、普通生物与临时改型一致。 */
    function hailIce(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), actor = access.actor(target.ref);
        if (actor === null || !access.valid(actor)) return false;
        try { return PokemonDamage.combatants.read(access, actor).types.indexOf("ice") >= 0; } catch (error) { return false; }
    }
    /** 头顶到雹云没有实心遮挡：与规则同一份真实方块射线，取真实接触点。 */
    function hailOpen(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context);
        const actor = access.actor(target.ref), body = actor === null ? null : access.observe(actor);
        if (body === null) return false;
        const centre = body.position(), head = centre.plus(WorldCombat.point(0, body.height() / 2 + 0.2, 0));
        return WorldGeometry.blockHit(access, head, WorldCombat.point(head.x(), head.y() + 24, head.z())) === null;
    }
    /** 本招在该个体上的实际雹区半径，和判定与指示圈同源。 */
    function hailRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const access = world(context);
        return Math.max(1, PokemonSkills.p("hail", "stormRadius",
            { world: access, actor: access.source(), skill: PokemonSkills.skills["hail"], detail: { values: item.data.config } }));
    }
    /** 与 method.create 一致的落点：advance 开时压在自己与威胁之间，否则脚下。 */
    function hailPlanned(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null, share: number): number[] {
        const self = source(context);
        if (!threat || !ai<boolean>(item, "advance", true)) return self.point;
        const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(3, length * share);
        return [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
    }
    /** 计划雹区里会被真正砸到的活体净收益：友方（含自己）为负、敌方为正；冰之躯与屋檐下的都不计。 */
    function hailNet(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const self = source(context);
        let score = 0;
        if (distance(self.point, centre) <= radius && !hailIce(context, self)) score -= 12;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length && i < 20; i++) {
            const other = nearby[i];
            if (other.health <= 0 || other.ref === self.ref || distance(other.point, centre) > radius) continue;
            if (hailIce(context, other)) continue;
            if (!hailOpen(context, other)) continue;
            score += other.friendly ? -10 : 8;
        }
        return score;
    }

    registerUse("hail", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            const threat: Entity | null = target || context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context), ice = hailIce(context, threat);
            let value = ice ? 40 : 58;
            if (!ice && hailOpen(context, threat)) value += 8;
            if (hailIce(context, self)) value = Math.min(100, value + 6);
            const centre = hailPlanned(context, item, threat, 0.5), radius = hailRadius(context, item);
            value += Math.max(-40, Math.min(16, hailNet(context, centre, radius)));
            return Math.max(0, Math.min(100, value));
        },
        available: function (context, item, _purpose, _target) { return hailWants(context, item, context.senses["world_combat:threat"]); }
    });
    function hailWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !hailInside(context);
    }
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
                // 计划落点附近有非冰友方会被罩住时，把雹区往威胁一侧收，别把队友一起罩住。
                const risk = hailNet(current, self.point, hailRadius(current, item));
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", true) && threat) {
                    const point = hailPlanned(current, item, threat, risk < 0 ? 0.7 : 0.5);
                    copy.point = point;
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
