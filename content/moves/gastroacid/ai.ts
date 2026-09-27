/**
 * 胃液 / gastroacid 的伙伴 AI 用途。
 *
 * 出手条件：目标可见、敌对、还活着，在 `ai.maxChase` 内，视线通畅，且酸膜对它能实际作用
 * （普通生物必成立；宝可梦要有可压制特性、可受残留酸伤或有护甲之一）。
 * 收益按真实事实分档：可压制特性最高，其次是可蚀护甲与可受残留酸伤，不再对任意普通敌固定给满分。
 * 注意：沾酸只压制当前仍生效的特性；威吓这类进入战斗时已触发的一次性效果，事后沾酸不能倒回，不据此加分。
 */
namespace CompanionBehavior {
    registerFact("world_combat:gastroacid-open", function (access, actor, _argument) {
        return PokemonSkills.gastroacidCanAct(access, actor);
    });
    registerFact("world_combat:gastroacid-value", function (access, actor, _argument) {
        if (!access.valid(actor)) return 0;
        let score = 12;
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(access, actor);
            const ability = NativeEffects.ability(pokemon, state);
            if (ability && !NativeAbilities.flag(ability, "cantsuppress")) score += 45;
            if (!NativeAbilities.flag(ability, "indirectImmune")) score += 8;
        } else {
            score += 8;
        }
        const armor = access.attributeValue(actor, "minecraft:generic.armor");
        if (armor !== null && armor.value() > 0) score += 12;
        return Math.max(0, Math.min(65, score));
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
            if (!gastroacidWants(context, item, target)) return 0;
            return fact<number>(context, "world_combat:gastroacid-value", target) || 0;
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
