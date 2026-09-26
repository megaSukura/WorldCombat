/** disable：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_disable/last", function (access, actor, argument) {
        const maxAge = typeof argument === "number" && isFinite(argument) && argument > 0 ? argument : 120;
        if (String(actor.domain()) !== "cobblemon") {
            const last = DamageSemantics.recentAttack(access, actor, maxAge);
            return last ? last.type : "";
        }
        const state = NativeEffects.read(access, actor);
        if (!state.used) return "";
        const tick = typeof state.usedTick === "number" && isFinite(state.usedTick) ? state.usedTick : -1000;
        if (access.tick() - tick > maxAge) return "";
        return String(state.used);
    });

    /** 本次决策读出的真实记忆窗口：特攻越高读得越远；AI 用它读对手的手，误差与执行层一致。 */
    function disableMemory(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const cached = context.scratch.disableMemory;
        if (typeof cached === "number") return cached;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        const value = actor ? p(disableId, "memory",
            { world: world, actor: actor, skill: skills[disableId], detail: { values: item.data.config || {} } }) : 0;
        const memory = isFinite(value) && value > 0 ? value : 120;
        context.scratch.disableMemory = memory;
        return memory;
    }
    /** 目标最近是否真的出手过一次（原生攻击只记造成过伤害的那一下），且仍在本次记忆窗口内。 */
    function disableReadable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const last = CompanionBehavior.fact<string>(context, "world_combat:move_disable/last", target, disableMemory(context, item));
        return last !== null && last !== "" && last !== "struggle";
    }

    function disableWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, disableStatus)) return false;
        if (!disableReadable(context, item, target)) return false;
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
            const last = CompanionBehavior.fact<string>(context, "world_combat:move_disable/last", target, disableMemory(context, item));
            return String(last).indexOf(":") >= 0 || CobblemonCombat.moveTemplate(String(last)).power() >= 60 ? 50 : 35;
        }
    });

    addPreferences(disableId, { heavy: false, ai: { maxChase: 14, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
