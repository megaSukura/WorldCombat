/**
 * 充电 / Charge — 伙伴 AI 用途与自己的出手计划。
 *
 * 充能是纯增益，但只对电属性招式的下一次命中兑现，所以自己的计划会把它排在交战之前：
 *   何时考虑  自身没有充能、有 threat 在 ai.maxChase 之内、不在驻守点（除非允许离位）。
 *   出手时机  ai.opening = incoming 时只在正被攻击（或刚受伤）时充能，像是被压制时反手蓄力。
 *   对谁出手  自己；不需要接近，由共用任务直接施放。
 *   放完之后  特防 +1 级、电招蓄势待发，随后把伤害交回共用交战计划；充能还在时不再重复。
 *   优先级    插在 world_combat:defend 之前，让「先蓄力再出手」成为默认次序。
 * ai.leaveStation：驻守中的伙伴是否愿意离位去充能。
 */
namespace CompanionBehavior {
    const chargeChase = PokemonSkills.number("ai.maxChase", "蓄力距离", 2, 24, 1);
    chargeChase.help = "伙伴只在威胁离自己这么远以内时才考虑充能；调小只在贴身时蓄力，调大愿意先手准备。";
    const chargeOpening = PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时蓄力", "迎击蓄力"]);
    chargeOpening.help = "「迎击蓄力」时，伙伴等自己正在被攻击（或刚受伤）时才充能，看起来像被压制时反手蓄力。";
    const chargeLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    chargeLeave.help = "开启后，驻守中的伙伴会离开原位去充能。";

    PokemonSkills.addPreferences("charge", { ai: { maxChase: 12, opening: "anytime", leaveStation: false } },
        [chargeChase, chargeOpening, chargeLeave]);

    function chargeCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:fortify");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "charge") return items[i];
        return null;
    }
    function chargeUseful(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (ready(context, "world_combat:attack").some(item => {
            const move = item.data && item.data.move ? CobblemonCombat.moveTemplate(String(item.data.move)) : null;
            return move !== null && String(move.type()).toLowerCase() === "electric";
        })) return true;
        if (threat === null || stage(context, source(context), "spd") >= 6) return false;
        const scope = world(context), opponent = scope.actor(threat.ref);
        if (opponent === null) return false;
        if (String(opponent.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(opponent);
            return pokemon.stat("spa") > pokemon.stat("atk");
        }
        const attack = DamageSemantics.recentAttack(scope, opponent, 120);
        return attack !== null && attack.category === "special";
    }
    function chargeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (status(context, self, "charge")) return false;
        if (!chargeUseful(context, threat)) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (ai<string>(item, "opening", "anytime") !== "incoming") return !!threat;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || !!threat && (threat.attacking === self.ref || !!owner && threat.attacking === owner.ref);
    }

    registerUse("charge", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        priority: function () { return 60; },
        available: function (context, item, _purpose, _target) {
            if (status(context, source(context), "charge")) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!chargeUseful(context, threat)) return false;
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
            const chase = ai<number>(item, "maxChase", 12);
            if (!threat || distance(source(context).point, threat.point) > chase) return false;
            if (ai<string>(item, "opening", "anytime") !== "incoming") return true;
            const owner = context.facts.owner;
            return source(context).hurtAgo < 60 || threat.attacking === source(context).ref || !!owner && threat.attacking === owner.ref;
        }
    });
    registry.goal({ id: "world_combat:move_charge/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = chargeCapability(context);
            if (!item) return [];
            if (!chargeWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_charge", kind: "world_combat:move_charge", data: { ref: source(context).ref } }];
        } });
    registry.method({ id: "world_combat:move_charge/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_charge") return [];
            const item = chargeCapability(context);
            if (!item || !chargeWants(context, item, context.senses["world_combat:threat"])) return [];
            return [{ id: item.id, data: {}, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "fortify", function (current) { return source(current); });
        }
    });
    orderGoals("world_combat:move_charge/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_charge");
    });
}
