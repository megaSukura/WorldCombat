/**
 * 青草场地 / grassyterrain 的伙伴 AI 用途与自己的出手计划。
 *
 * 草地是双方共享的续航：每一段回复按各自最大生命给，所以 AI 比较的是「这片草先托谁」——把双方预计站在
 * 草地上、尚未满血的活体的缺失生命各自累加，只有己方净收益站得住（己方伤得更重、且明显多过对手）才开。
 * 高血 Boss 站在草里会按时回一大截，所以它缺得越多，AI 越不愿替对手铺这块地；队友受伤聚集时优先，
 * 而不是把它当成固定的开场仪式。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内，自己还没站在一片青草里，且己方缺失生命
 * 高于敌方（也就是这块草净托住了己方）。
 * 出手前的位置：`ai.advance` 关闭（默认）时把草种在脚下，先托住自己与身边的伤者；开启时往前压向交战区。
 * 放完之后把伤害交回共用交战计划；还站在草地里时不再重复。
 */
namespace CompanionBehavior {
    const grassyChase = PokemonSkills.number("ai.maxChase", "种草距离", 2, 24, 1);
    grassyChase.help = "伙伴只在威胁离自己这么远以内时才考虑青草场地；调小只在贴身时种草，调大愿意提前布置。";
    const grassyAdvance = PokemonSkills.flag("ai.advance", "把草地压向对手");
    grassyAdvance.help = "开启后把草种在自己与威胁之间，让交战区落在草上；关闭则种在脚下先托住自己与身边的伤者。";

    PokemonSkills.addPreferences("grassyterrain", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [grassyChase, grassyAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    /** 这一片草地实际会盖住多大，直接读本招 resolve 出的 fieldRadius，失败时退回中性估计。 */
    function grassyRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const scope = world(context);
            return Math.max(2, Math.min(6, PokemonSkills.p("grassyterrain", "fieldRadius",
                { world: scope, actor: scope.source(), detail: { values: item.data.config } })));
        } catch (error) {
            return 3.5;
        }
    }
    function grassyAnchorPoint(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number[] {
        const self = source(context), point = self.point.slice();
        if (ai<boolean>(item, "advance", false) && threat) {
            const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
            const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
            return [point[0] + dx / length * step, point[1], point[2] + dz / length * step];
        }
        return point;
    }
    function grassyMissing(subject: Entity, anchor: number[], radius: number): number {
        if (!subject.grounded || !(subject.health > 0) || !subject.visible) return 0;
        if (distance(subject.point, anchor) > radius) return 0;
        return Math.max(0, subject.maximum - subject.health);
    }
    function grassyGather(context: WorldBehavior.Context, friendly: boolean, anchor: number[], radius: number): number {
        let missing = friendly ? grassyMissing(source(context), anchor, radius) : 0;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (friendly ? !other.friendly : !other.hostile) continue;
            missing += grassyMissing(other, anchor, radius);
        }
        return missing;
    }
    function grassyBenefit(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): { friendly: number; enemy: number } {
        const anchor = grassyAnchorPoint(context, item, threat), radius = grassyRadius(context, item);
        return { friendly: grassyGather(context, true, anchor, radius), enemy: grassyGather(context, false, anchor, radius) };
    }

    function grassyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "grassyterrain") return items[i];
        return null;
    }
    function grassyInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.grassyField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function grassyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (grassyInside(context)) return false;
        const benefit = grassyBenefit(context, item, threat);
        return benefit.friendly > 0 && benefit.friendly > benefit.enemy;
    }

    registerUse("grassyterrain", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            if (!target) return 0;
            const threat: Entity | null = target.friendly || !(target.health > 0) ? context.senses["world_combat:threat"] : target;
            if (!grassyWants(context, item, threat)) return 0;
            const benefit = grassyBenefit(context, item, threat);
            return 40 + Math.min(30, Math.round(benefit.friendly));
        },
        available: function (context, item, _purpose, _target) { return grassyWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_grassyterrain/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = grassyCapability(context);
            if (!item || !grassyWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_grassyterrain:" + threat.ref, kind: "world_combat:move_grassyterrain", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_grassyterrain/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_grassyterrain") return [];
            const item = grassyCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !grassyWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                copy.point = grassyAnchorPoint(current, item, threat);
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_grassyterrain/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_grassyterrain");
    });
}
