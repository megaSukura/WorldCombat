/** disable：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_disable/last", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") {
            const last = DamageSemantics.recentAttack(access, actor, 120);
            return last ? last.type : "";
        }
        const state = NativeEffects.read(access, actor);
        if (!state.used || access.tick() - (state.usedTick || -1000) > 120) return "";
        return String(state.used);
    });

    function disableWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, disableStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(disableId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return target === null ? true : disableWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !disableWants(context, item, target)) return 0;
            const last = CompanionBehavior.fact<string>(context, "world_combat:move_disable/last", target);
            if (last === null || last === "") return 8;
            return String(last).indexOf(":") >= 0 || CobblemonCombat.moveTemplate(String(last)).power() >= 60 ? 50 : 35;
        }
    });

    addPreferences(disableId, { heavy: false, ai: { maxChase: 14, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
