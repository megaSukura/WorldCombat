/**
 * 描绘 / doodle — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线，对手的特性读得出来且可以被抄，
 *   并且自己或身边至少一只同伴的特性与它不同（否则一次全是空操作）。
 * 对谁出手：当前威胁；特性已被压制、或整队都已经是这份特性的目标跳过。
 * 候选之间怎么排：身边有同伴需要换特性时 priority 62（描绘的价值在整队），只有自己需要时 45。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再描。
 * 放完之后：自己和画幅内特性不同的同伴一起获得对手的特性，交回共享交战计划。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:doodle-ability", function (access, actor, _argument) {
        return PokemonSkills.doodleAbility(access, actor);
    });

    function doodleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 15)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        const theirs = fact<string>(context, "world_combat:doodle-ability", target);
        if (theirs === null || !PokemonSkills.doodleCopyable(theirs)) return false;
        if (fact<string>(context, "world_combat:doodle-ability", self) !== theirs) return true;
        const nearby = (context.facts.nearby as Entity[]) || [];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0) continue;
            if (fact<string>(context, "world_combat:doodle-ability", other) !== theirs) return true;
        }
        return false;
    }

    registerUse("doodle", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return doodleWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            if (!doodleWants(context, item, target)) return 0;
            const self = source(context), theirs = fact<string>(context, "world_combat:doodle-ability", target);
            return fact<string>(context, "world_combat:doodle-ability", self) !== theirs ? 45 : 62;
        }
    });

    const doodleChase = PokemonSkills.number("ai.maxChase", "读稿距离", 4, 28, 1);
    doodleChase.help = "威胁进入这个距离内才考虑描绘；越大越愿意隔着一段距离先描，调小只在贴身时抄。";
    const doodleStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    doodleStation.help = "开启后，驻守中的伙伴也会离位去描对手的本质；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("doodle", { ai: { maxChase: 15, leaveStation: false } }, [doodleChase, doodleStation]);

    function doodleCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "doodle") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_doodle/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = doodleCapability(context);
            if (!item || !doodleWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 80)) return [];
            return [{ id: "world_combat:move_doodle:" + threat.ref, kind: "world_combat:move_doodle", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_doodle/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_doodle") return [];
            const item = doodleCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !doodleWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_doodle/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_doodle");
    });
}
