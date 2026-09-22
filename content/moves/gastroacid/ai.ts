/**
 * 胃液 / gastroacid — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线、目标身上还没有“沾酸”标记，
 *   而且它是宝可梦、特性读得出来且没被标成不可压制（`native-abilities` 的 cantsuppress）。
 * 对谁出手：当前威胁；已经被胃液蚀过、或特性为空的目标跳过，不重复吐。
 * 候选之间怎么排：priority 65，排在普通出手之前，先把对手的持续特性拆掉。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再吐。
 * 放完之后：对手的特性被压制一段时间，交回共享交战计划；标记与压制层同时到期。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:gastroacid-open", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(access, actor);
        const ability = NativeEffects.ability(pokemon, state);
        return !!ability && !NativeAbilities.flag(ability, "cantsuppress");
    });

    function gastroacidWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, target, "gastroacid")) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 16)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        return fact<boolean>(context, "world_combat:gastroacid-open", target) === true;
    }

    registerUse("gastroacid", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return gastroacidWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            return gastroacidWants(context, item, target) ? 65 : 0;
        }
    });

    const gastroacidChase = PokemonSkills.number("ai.maxChase", "考虑距离", 4, 30, 1);
    gastroacidChase.help = "威胁进入这个距离内才考虑吐胃液；越大越愿意隔着一段距离先拆特性，调小只在贴身时用。";
    const gastroacidStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    gastroacidStation.help = "开启后，驻守中的伙伴也会离位去拆对手的特性；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("gastroacid", { ai: { maxChase: 16, leaveStation: false } }, [gastroacidChase, gastroacidStation]);

    function gastroacidCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "gastroacid") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_gastroacid/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = gastroacidCapability(context);
            if (!item || !gastroacidWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 120)) return [];
            return [{ id: "world_combat:move_gastroacid:" + threat.ref, kind: "world_combat:move_gastroacid", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_gastroacid/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_gastroacid") return [];
            const item = gastroacidCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !gastroacidWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_gastroacid/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_gastroacid");
    });
}
