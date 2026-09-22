/**
 * 传递礼物 / bestow —— AI 用途与自己的出手计划。
 *
 * 什么局面下有意义：自己手里有可送的道具，身边有一个空手、没被查封、还是宝可梦的伙伴，且在
 *   `ai.maxChase`（默认 12）格内、与施法者通视。它是一手开战前的安排，不依赖场上一定已经打起来，
 *   所以有自己的 goal 与方法，而不是等共享的 bolster 伙伴观测（那只在有威胁且队友在挨打时才成立）。
 * 对谁出手：最近的那个空手伙伴，不接受自己、也不接受敌人——礼物要有收件人。
 * 候选之间怎么排：priority 40；送出去后自己空手，`available` 随即不再成立，同一件道具只送一次。
 * 够不到怎么办：reach 就是本招射程，共享任务先走到能通视的射程再递；`ai.leaveStation` 决定驻守时是否愿意离位。
 * `ai.giftBelow`（默认 1.0）可以把礼物留到队友生命掉到某个比例以下再递。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_bestow/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (String(actor.domain()) !== "cobblemon") return "";
        return String(CobblemonCombat.pokemon(actor).heldItem()).replace("cobblemon:", "");
    });

    function bestowHeldOf(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_bestow/held", target) || "";
    }
    function bestowCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:bolster");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "bestow") return items[i];
        return null;
    }
    function bestowWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity | null): boolean {
        if (!ally || ally.health <= 0 || !ally.visible || !ally.friendly) return false;
        const self = source(context);
        if (ally.ref === self.ref) return false;
        if (domain(context, ally) !== "cobblemon") return false;
        if (status(context, ally, "embargo")) return false;
        if (bestowHeldOf(context, self) === "") return false;
        if (bestowHeldOf(context, ally) !== "") return false;
        if (ally.health / Math.max(1, ally.maximum) > ai<number>(item, "giftBelow", 1.0)) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 12)) return false;
        return world(context).clear(point(self.point), point(ally.point));
    }
    function bestowTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const nearby = (context.facts.nearby || []) as Entity[];
        let chosen: Entity | null = null, best = Infinity;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!bestowWants(context, item, other)) continue;
            const reach = distance(source(context).point, other.point);
            if (reach < best) { best = reach; chosen = other; }
        }
        return chosen;
    }

    registerUse("bestow", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bestowWants(context, item, target);
        },
        accepts: function (context, _item, target) {
            return target.friendly && target.ref !== source(context).ref && target.health > 0 && target.visible;
        },
        priority: function (_context, _item, target) { return target ? 40 : 0; }
    });

    registry.goal({ id: "world_combat:move_bestow/goal", propose: function (context) {
        const item = bestowCapability(context);
        if (!item) return [];
        const ally = bestowTarget(context, item);
        if (!ally) return [];
        return [{ id: "world_combat:move_bestow:" + ally.ref, kind: "world_combat:move_bestow", data: { ref: ally.ref } }];
    } });
    registry.method({ id: "world_combat:move_bestow/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_bestow") return [];
            const item = bestowCapability(context), ally = entity(context, goal.data.ref);
            if (!item || !bestowWants(context, item, ally)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "bolster", goalEntity);
        }
    });
    orderGoals("world_combat:move_bestow/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_bestow");
    });

    const bestowChase = PokemonSkills.number("ai.maxChase", "递送距离", 2, 16, 1);
    bestowChase.help = "伙伴要把礼物递给这么远以内的队友；调小只在贴身时递，调大愿意跑一段把道具送过去。";
    const bestowBelow = PokemonSkills.number("ai.giftBelow", "只在队友生命低于此比例时递", 0.2, 1, 0.05);
    bestowBelow.help = "默认 1.0：开战前就把道具递给空手的队友。调低后只在队友生命掉到这个比例以下才递，把礼物留到更危险的时刻。";
    const bestowStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    bestowStation.help = "开启后，收到「驻守」指令时也会离开原位去递礼物；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("bestow", { ai: { maxChase: 12, giftBelow: 1.0, leaveStation: false } },
        [bestowChase, bestowBelow, bestowStation]);
}
