/**
 * 迷人 / Attract — 伙伴 AI 用途与自己的出手计划。
 *
 * 飞吻不是伤害而是远程软控，所以除了 registerUse 还挂一份自己的目标与优先级：
 *   何时考虑  有 threat、这招就绪、它在 ai.maxChase 之内、还没着迷、视线畅通、宝可梦目标为异性。
 *   对谁出手  当前 threat；焦点目标直接通过。
 *   出手时机  ai.opening = incoming 时只在 threat 正攻击自己/主人（或自己刚受伤）时掷出飞吻。
 *   够不到    由共用任务走到 reach；accepts 不按距离硬拒，会先靠近再掷。
 *   放完之后  目标出手变得不可靠、又被拴在你身边，随后把伤害交回共用交战计划。
 *   优先级    插在 world_combat:defend 之前；对正在逃跑的目标给 100（越过共用顺序），把它拴住。
 * ai.leaveStation：驻守中的伙伴是否愿意离位去掷这个飞吻。
 * ai.runnersOnly：只牵制正在逃跑的威胁，把它当成留人技能而不是泛用软控。
 */
namespace CompanionBehavior {
    const attractChase = PokemonSkills.number("ai.maxChase", "示好距离", 2, 24, 1);
    attractChase.help = "伙伴只在威胁离自己这么远以内时才考虑掷飞吻；调小只在贴身时出手，调大愿意先手。";
    const attractOpening = PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时示好", "迎击示好"]);
    attractOpening.help = "「迎击示好」时，伙伴等威胁正在攻击自己或主人时才掷出飞吻，看起来像被逼近时反手牵制。";
    const attractLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    attractLeave.help = "开启后，驻守中的伙伴会离开原位去对示好距离内的威胁掷飞吻。";
    const attractRunners = PokemonSkills.flag("ai.runnersOnly", "只牵制逃者");
    attractRunners.help = "开启后，伙伴只对正在逃跑的威胁掷飞吻，把它拴住；关闭时对范围内任何威胁都愿意示好。";

    PokemonSkills.addPreferences("attract", { ai: { maxChase: 12, opening: "anytime", leaveStation: false, runnersOnly: false } },
        [attractChase, attractOpening, attractLeave, attractRunners]);

    function attractOpposite(first: string, second: string): boolean {
        const a = String(first).toLowerCase(), b = String(second).toLowerCase();
        return a === "male" && b === "female" || a === "female" && b === "male" || a === "m" && b === "f" || a === "f" && b === "m";
    }
    /** Pokemon must be the opposite gender; every other body has no gender and passes. */
    function attractAllows(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), other = access.actor(target.ref);
        if (!other || String(other.domain()) !== "cobblemon") return true;
        const self = access.source();
        if (String(self.domain()) !== "cobblemon") return true;
        return attractOpposite(String(CobblemonCombat.pokemon(self).gender()), String(CobblemonCombat.pokemon(other).gender()));
    }
    function attractWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (!threat.visible || threat.friendly || threat.health <= 0) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        if (status(context, threat, "attract")) return false;
        if (ai<boolean>(item, "runnersOnly", false) && !fleeing(context, threat)) return false;
        if (!attractAllows(context, threat)) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "incoming") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }
    function attractCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "attract") return items[i];
        return null;
    }

    registerUse("attract", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, _item, target) { return target && fleeing(context, target) ? 100 : 20; },
        accepts: function (context, item, target) { return attractWants(context, item, target); }
    });
    registry.goal({ id: "world_combat:move_attract/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = attractCapability(context);
            if (!item) return [];
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return [];
            if (!attractWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 160)) return [];
            return [{ id: "world_combat:move_attract:" + threat.ref, kind: "world_combat:move_attract", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_attract/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_attract") return [];
            const item = attractCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !attractWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control", function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_attract/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_attract");
    });
}
