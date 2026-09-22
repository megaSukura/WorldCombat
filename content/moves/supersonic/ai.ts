/**
 * 超音波 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被混乱缠上，而且它已经进入声浪半径（伙伴会先走到能扫到的距离）。
 *   声浪不是射线、绕得过墙，所以不看通视；它是一次以自己为心的范围事，值不值得发取决于身边有几个敌人——
 *   周围敌人数越多，优先级越高。ai.opening=被围时（默认）只在身边至少两个敌人、或自己刚被打过时发声；
 *   =随时时见一个威胁也发，当单体扰乱用。
 * 对谁出手：当前威胁（决定走位与朝向）；实际被扫到的是波前经过的所有非友方。
 * 够不到怎么办：reach 就是声浪半径（集中形态更短），伙伴会先走近到能扫到目标再发声。
 * 放完之后：被打懵的敌人出手可能作废、打中还会自伤；交回共享顺序重新判断站位。
 * 配置 band（广域／集中）改变半径、混乱时长与强度；ai.maxChase、ai.opening 决定追多远、什么时候发。
 */
namespace PokemonSkills {
    function supersonicSweep(item: WorldBehavior.Capability, context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const reach = item.data.range, self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }
    function supersonicWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "confusion")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
        if (CompanionBehavior.ai<string>(item, "opening", "anytime") !== "swarmed") return true;
        return supersonicSweep(item, context, target) >= 2 || self.hurtAgo < 40;
    }

    CompanionBehavior.registerUse("supersonic", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.config && item.data.config.band === "deep" ? item.data.range * 0.7 : item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : supersonicWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !supersonicWants(context, item, target)) return 0;
            return 45 + Math.min(25, supersonicSweep(item, context, target) * 10);
        }
    });

    addPreferences(supersonicId, { ai: { maxChase: 10, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 3, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑发声；越大越早发，也越可能被反打。" }),
        choice("ai.opening", "出手时机", ["swarmed", "anytime"], ["被围时", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);

    function supersonicCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = CompanionBehavior.ready(context, "world_combat:control");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "supersonic") return items[i];
        return null;
    }
    CompanionBehavior.registry.goal({ id: "world_combat:move_supersonic/goal", propose: function (context) {
        if (context.facts.intent === "hold") return [];
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
        if (!threat) return [];
        const item = supersonicCapability(context);
        if (!item || !supersonicWants(context, item, threat)) return [];
        if (CompanionBehavior.recent(context, "control", threat.ref, 160)) return [];
        return [{ id: "world_combat:move_supersonic:" + threat.ref, kind: "world_combat:move_supersonic", data: { ref: threat.ref } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_supersonic/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_supersonic") return [];
            const item = supersonicCapability(context), threat = CompanionBehavior.entity(context, goal.data.ref);
            if (!item || !threat || !supersonicWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return CompanionBehavior.castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return CompanionBehavior.entity(current, current.choice!.goal.data.ref); });
        }
    });
    CompanionBehavior.orderGoals("world_combat:move_supersonic/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_supersonic");
    });
}
