/**
 * 求雨 / raindance 的伙伴 AI 用途与自己的出手计划。
 *
 * 判断的不是「有没有敌人」，而是「这场雨站在谁那边」：读得到招式的精灵（宝可梦）按各自的水招、火招与
 * 灼伤逐一点算——己方水招与身上的火是收益，己方火招、敌方水招、敌方身上的火是代价；同一套收益也在
 * 布置位置上体现，优先把雨铺在己方身上，而不是机械地压到敌人脚下。未知来源的其他模组生物读不到招式，
 * 不臆造它对水／火的收益，只有真实证据（灼伤、通视）才计入。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，自己还没站在一片雨里，且上面算出的
 * 雨之收益为正（能救火、能托住己方水招、能压住已知火招，才值得占一次出手）。
 * 出手前的位置：`ai.advance` 开启时把雨往威胁方向推几步；关闭（默认）时把雨留在收益最大的一方——
 * 有队友带灼伤就盖在他身上，否则盖在自己或带水招的队友身上。
 * 为什么值得先手：雨区同时给水招加成、压火招，还能浇灭自己或队友身上的灼伤与火焰；收益为正时才开，
 * 插在 `world_combat:defend` 之前当作开打前的布置。
 * 放完之后把伤害交回共用交战计划；还站在雨里或收益不再为正时不再重复。
 */
namespace CompanionBehavior {
    const raindanceChase = PokemonSkills.number("ai.maxChase", "布雨距离", 2, 24, 1);
    raindanceChase.help = "伙伴只在威胁离自己这么远以内时才考虑求雨；调小只在贴身时叫雨，调大愿意提前布置。";
    const raindanceAdvance = PokemonSkills.flag("ai.advance", "把雨压向对手");
    raindanceAdvance.help = "开启后把雨叫在自己与威胁之间，让交战区落在雨里；关闭则叫在收益最大的一方——先盖住带灼伤的队友或自己。";

    PokemonSkills.addPreferences("raindance", { ai: { maxChase: 14, advance: false, leaveStation: false } },
        [raindanceChase, raindanceAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    interface raindanceSide { water: number; fire: number; burning: number; }

    /** 读一只精灵的伤害招属性计数；非宝可梦（读不到招式）返回 null，表示对水／火收益未知。 */
    registerFact("world_combat:move_raindance/moves", function (_access, actor, _argument): any {
        if (String(actor.domain()) !== "cobblemon") return null;
        const pokemon = CobblemonCombat.pokemon(actor), counts = { water: 0, fire: 0 };
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (!move || String(move.category()) === "status") continue;
            const type = String(move.type()).toLowerCase();
            if (type === "water") counts.water++;
            else if (type === "fire") counts.fire++;
        }
        return counts;
    });

    function raindanceMoves(context: WorldBehavior.Context, subject: Entity): { water: number; fire: number } {
        return fact<{ water: number; fire: number }>(context, "world_combat:move_raindance/moves", subject) || { water: 0, fire: 0 };
    }

    function raindanceAdd(context: WorldBehavior.Context, subject: Entity, side: raindanceSide): void {
        const moves = raindanceMoves(context, subject);
        side.water += moves.water; side.fire += moves.fire;
        if (status(context, subject, "burn")) side.burning++;
    }

    /** 一侧的收益事实：己方（含自己）或敌方（可见敌对）的水招、火招与灼伤计数。 */
    function raindanceSide(context: WorldBehavior.Context, friendly: boolean): raindanceSide {
        const side: raindanceSide = { water: 0, fire: 0, burning: 0 };
        if (friendly) raindanceAdd(context, source(context), side);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!(other.health > 0) || !other.visible) continue;
            if (friendly ? !other.friendly : !other.hostile) continue;
            raindanceAdd(context, other, side);
        }
        return side;
    }

    /** 正值表示这场雨净帮到自己：己方水招／灼伤是收益，己方火招、敌方水招与敌方灼伤是代价。 */
    function raindanceValue(context: WorldBehavior.Context): number {
        const ours = raindanceSide(context, true), theirs = raindanceSide(context, false);
        return 3 * ours.water - 3 * ours.fire + 12 * ours.burning
            - 3 * theirs.water + 3 * theirs.fire - 8 * theirs.burning;
    }

    /** 最该被这片雨盖住的己方目标：带灼伤的队友 > 自己（带水招）> 带水招的队友 > 自己。 */
    function raindanceAnchor(context: WorldBehavior.Context): Entity {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.visible && status(context, other, "burn")) return other;
        }
        if (raindanceMoves(context, self).water > 0) return self;
        for (let j = 0; j < nearby.length; j++) {
            const ally = nearby[j];
            if (ally.friendly && ally.health > 0 && ally.visible && raindanceMoves(context, ally).water > 0) return ally;
        }
        return self;
    }

    function raindanceCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "raindance") return items[i];
        return null;
    }
    function raindanceInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.raindanceField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function raindanceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        if (raindanceInside(context)) return false;
        return raindanceValue(context) > 0;
    }

    registerUse("raindance", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, _item) {
            const ours = raindanceSide(context, true);
            return ours.burning > 0 ? 70 : 45;
        },
        available: function (context, item, _purpose, _target) { return raindanceWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_raindance/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = raindanceCapability(context);
            if (!item || !raindanceWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_raindance:" + threat.ref, kind: "world_combat:move_raindance", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_raindance/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_raindance") return [];
            const item = raindanceCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !raindanceWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const anchor = raindanceAnchor(current);
                const copy: Entity = JSON.parse(JSON.stringify(anchor));
                if (ai<boolean>(item, "advance", false) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(3, length * 0.5);
                    copy.point = [copy.point[0] + dx / length * step, copy.point[1], copy.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_raindance/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_raindance");
    });
}
