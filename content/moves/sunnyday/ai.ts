/**
 * 大晴天 / sunnyday 的伙伴 AI 用途与自己的出手计划。
 *
 * 判断的不是「有没有敌人」，而是「这片阳光照在谁身上」：读得到招式的精灵（宝可梦）按各自的火招、日照
 * 蓄力招（日光束／日光刃）与冻结／湿身逐一点算——己方火招与蓄力招、需要晒化的冻结和要蒸干的湿身是收益，
 * 己方水招会被晒弱、敌方已知的火招同样会被这片阳光抬高所以谨慎。未知来源的其他模组生物读不到招式，
 * 不臆造它对火／水的收益。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，自己还没站在一片烈日里，且上面算出的
 * 阳光收益为正（能托住己方火招／蓄力招、能解冻烘干，才值得占一次出手）。
 * 出手前的位置：默认把太阳叫在自己或带火招／蓄力招的队友身上，需要解冻时盖在冻结的队友身上；
 *   `ai.advance` 开启时再往威胁方向推几步。敌我同规则，双方都会在阳光里获得加成，所以收益不占优就不开。
 * 为什么值得先手：阳光同时给火招加成、压水招，还能晒化冻结、蒸干湿身；插在 `world_combat:defend` 之前。
 * 放完之后把伤害交回共用交战计划；还站在烈日里或收益不再为正时不再重复。
 */
namespace CompanionBehavior {
    const sunnyChase = PokemonSkills.number("ai.maxChase", "叫晴距离", 2, 24, 1);
    sunnyChase.help = "伙伴只在威胁离自己这么远以内时才考虑大晴天；调小只在贴身时叫晴，调大愿意提前布置。";
    const sunnyAdvance = PokemonSkills.flag("ai.advance", "把烈日压向对手");
    sunnyAdvance.help = "开启后把太阳叫在自己与威胁之间，让交战区落在亮处；关闭则叫在收益最大的一方。";

    PokemonSkills.addPreferences("sunnyday", { ai: { maxChase: 14, advance: false, leaveStation: false } },
        [sunnyChase, sunnyAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    const sunnySolarMoves = ["solarbeam", "solarblade"];
    interface sunnySide { fire: number; solar: number; water: number; chilled: number; }

    /** 读一只精灵的火招、日照蓄力招与水招计数；非宝可梦（读不到招式）返回 null。 */
    registerFact("world_combat:move_sunnyday/moves", function (_access, actor, _argument): any {
        if (String(actor.domain()) !== "cobblemon") return null;
        const pokemon = CobblemonCombat.pokemon(actor), counts = { fire: 0, solar: 0, water: 0 };
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (!move || String(move.category()) === "status") continue;
            const type = String(move.type()).toLowerCase();
            if (sunnySolarMoves.indexOf(String(move.id())) >= 0) counts.solar++;
            else if (type === "fire") counts.fire++;
            else if (type === "water") counts.water++;
        }
        return counts;
    });

    function sunnyMoves(context: WorldBehavior.Context, subject: Entity): { fire: number; solar: number; water: number } {
        return fact<{ fire: number; solar: number; water: number }>(context, "world_combat:move_sunnyday/moves", subject) || { fire: 0, solar: 0, water: 0 };
    }
    function sunnyAdd(context: WorldBehavior.Context, subject: Entity, side: sunnySide): void {
        const moves = sunnyMoves(context, subject);
        side.fire += moves.fire; side.solar += moves.solar; side.water += moves.water;
        if (status(context, subject, "frozen") || status(context, subject, "soaked")) side.chilled++;
    }
    function sunnySide(context: WorldBehavior.Context, friendly: boolean): sunnySide {
        const side: sunnySide = { fire: 0, solar: 0, water: 0, chilled: 0 };
        if (friendly) sunnyAdd(context, source(context), side);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!(other.health > 0) || !other.visible) continue;
            if (friendly ? !other.friendly : !other.hostile) continue;
            sunnyAdd(context, other, side);
        }
        return side;
    }
    /** 正值表示这片阳光净帮到自己；敌方已知火招会一起变强，所以计为代价。 */
    function sunnyValue(context: WorldBehavior.Context): number {
        const ours = sunnySide(context, true), theirs = sunnySide(context, false);
        return 4 * (ours.fire + ours.solar) + 6 * ours.chilled
            - 3 * ours.water - 4 * theirs.fire + 3 * theirs.water;
    }
    /** 最该被这片烈日照到的己方目标：冻结／湿身的队友 > 自己（火招／蓄力招）> 带火招的队友 > 自己。 */
    function sunnyAnchor(context: WorldBehavior.Context): Entity {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.visible && (status(context, other, "frozen") || status(context, other, "soaked"))) return other;
        }
        const own = sunnyMoves(context, self);
        if (own.fire + own.solar > 0) return self;
        for (let j = 0; j < nearby.length; j++) {
            const ally = nearby[j];
            if (ally.friendly && ally.health > 0 && ally.visible) {
                const counts = sunnyMoves(context, ally);
                if (counts.fire + counts.solar > 0) return ally;
            }
        }
        return self;
    }

    function sunnyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "sunnyday") return items[i];
        return null;
    }
    function sunnyInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.sunnyField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function sunnyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        if (sunnyInside(context)) return false;
        return sunnyValue(context) > 0;
    }

    registerUse("sunnyday", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, _item) {
            const ours = sunnySide(context, true);
            return ours.chilled > 0 ? 70 : 45;
        },
        available: function (context, item, _purpose, _target) { return sunnyWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_sunnyday/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = sunnyCapability(context);
            if (!item || !sunnyWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_sunnyday:" + threat.ref, kind: "world_combat:move_sunnyday", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_sunnyday/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_sunnyday") return [];
            const item = sunnyCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !sunnyWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const anchor = sunnyAnchor(current);
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
    orderGoals("world_combat:move_sunnyday/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_sunnyday");
    });
}
