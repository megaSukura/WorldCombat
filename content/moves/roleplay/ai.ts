/**
 * 扮演 / roleplay — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线，而且对手的特性读得出来、可以被抄、
 *   又和自己当前的不一样。自己刚扮演过（带着 roleplay 标记）时由标记自然节流。
 * 对谁出手：当前威胁；特性已被压制、和自己相同的目标跳过。
 * 候选之间怎么排：只在自己完全没有这份特性时才考虑，priority 60，排在普通出手之前先把扮相披上。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再描。
 * 放完之后：自己临时获得对手的特性，交回共享交战计划。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:roleplay-ability", function (access, actor, _argument) {
        return PokemonSkills.roleplayAbility(access, actor);
    });

    function roleplayWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, source(context), "roleplay")) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 15)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        const theirs = fact<string>(context, "world_combat:roleplay-ability", target);
        if (theirs === null || !PokemonSkills.roleplayCopyable(theirs)) return false;
        const mine = fact<string>(context, "world_combat:roleplay-ability", self);
        if (mine === null) return false;
        if (typeof mine === "string" && mine === theirs) return false;
        return true;
    }

    registerUse("roleplay", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return roleplayWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            return roleplayWants(context, item, target) ? 60 : 0;
        }
    });

    const roleplayChase = PokemonSkills.number("ai.maxChase", "识别距离", 4, 28, 1);
    roleplayChase.help = "威胁进入这个距离内才考虑扮演；越大越愿意隔着一段距离先描，调小只在贴身时抄。";
    const roleplayStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    roleplayStation.help = "开启后，驻守中的伙伴也会离位去抄对手的特性；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("roleplay", { ai: { maxChase: 15, leaveStation: false } }, [roleplayChase, roleplayStation]);

    function roleplayCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "roleplay") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_roleplay/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = roleplayCapability(context);
            if (!item || !roleplayWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 80)) return [];
            return [{ id: "world_combat:move_roleplay:" + threat.ref, kind: "world_combat:move_roleplay", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_roleplay/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_roleplay") return [];
            const item = roleplayCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !roleplayWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_roleplay/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_roleplay");
    });
}
