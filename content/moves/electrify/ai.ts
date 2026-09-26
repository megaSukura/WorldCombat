/**
 * 输电 / Electrify — 伙伴 AI 用途与自己的出手计划。
 *
 * 输电是预判式单体干扰：命中不掷骰，但会被拖过时间或浪费在错误的一招上，所以要挑对时机与对象。
 *   何时考虑  有 threat、这招就绪、它在 ai.maxChase 之内、目标还没被通电、视线畅通。
 *   对谁出手  当前威胁；焦点目标直接通过。
 *   出手时机  ai.opening = incoming 时只在威胁正攻击自己/主人（或自己刚受伤）时输电，像是先手打断它这一招。
 *   够不到    由共用任务走到 reach；accepts 不按距离硬拒，会先靠近再输电。
 *   放完之后  目标下一次出招带电，随后把伤害交回共用交战计划。
 *   优先级    插在 world_combat:defend 之前，让「先改属性再打」成为默认次序。
 * ai.leaveStation：驻守中的伙伴是否愿意离位去输电。
 */
namespace CompanionBehavior {
    const electrifyChase = PokemonSkills.number("ai.maxChase", "输电距离", 2, 24, 1);
    electrifyChase.help = "伙伴只在威胁离自己这么远以内时才考虑输电；调小只在贴身时出手，调大愿意先手。";
    const electrifyOpening = PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时输电", "迎击输电"]);
    electrifyOpening.help = "「迎击输电」时，伙伴等威胁正在攻击自己或主人时才输电，看起来像先手把这一招改成电。";
    const electrifyLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    electrifyLeave.help = "开启后，驻守中的伙伴会离开原位去对输电距离内的威胁输电。";

    PokemonSkills.addPreferences("electrify", { ai: { maxChase: 8, opening: "anytime", leaveStation: false } },
        [electrifyChase, electrifyOpening, electrifyLeave]);

    function electrifyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "electrify") return items[i];
        return null;
    }
    function electrifyBenefits(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const scope = world(context), opponent = scope.actor(threat.ref);
        if (opponent === null) return false;
        const own = PokemonDamage.combatants.read(scope, scope.source());
        let type = "";
        if (String(opponent.domain()) === "cobblemon") {
            const last = NativeEffects.read(scope, opponent).used;
            const move = last ? CobblemonCombat.moveTemplate(last) : null;
            if (move !== null) type = String(move.type()).toLowerCase();
        } else if (DamageSemantics.recentAttack(scope, opponent, 120) === null) return false;
        const all = !!(item.data.config && item.data.config.allMoves);
        if (type === "electric" || !all && type !== "normal") return false;
        let before = 1, after = 1;
        own.types.forEach(defence => {
            if (type) before *= CobblemonCombat.typeEffectiveness(type, defence);
            after *= CobblemonCombat.typeEffectiveness("electric", defence);
        });
        return after < before;
    }
    function electrifyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (!threat.visible || threat.friendly || threat.health <= 0) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        if (status(context, threat, "electrify")) return false;
        if (!electrifyBenefits(context, item, threat)) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "incoming") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("electrify", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        priority: function () { return 50; },
        accepts: function (context, item, target) { return electrifyWants(context, item, target); }
    });
    registry.goal({ id: "world_combat:move_electrify/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = electrifyCapability(context);
            if (!item) return [];
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return [];
            if (!electrifyWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 160)) return [];
            return [{ id: "world_combat:move_electrify:" + threat.ref, kind: "world_combat:move_electrify", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_electrify/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_electrify") return [];
            const item = electrifyCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !electrifyWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control", function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_electrify/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_electrify");
    });
}
