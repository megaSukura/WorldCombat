/** Help visible declared preparation, or a player currently engaging a real enemy. */
namespace PokemonSkills {
    const afteryouChase = number("ai.maxChase", "让手距离", 3, 20, 1);
    afteryouChase.help = "伙伴离自己这个距离以内才考虑让手；调小只在贴身时让，调大愿意主动靠过去。";
    const afteryouLeave = flag("ai.leaveStation", "驻守时允许离位");
    afteryouLeave.help = "开启后，收到驻守命令时也会为让手离开原位。";

    addPreferences(afteryouId, { lead: 1, ai: { maxChase: 10, leaveStation: false } }, [afteryouChase, afteryouLeave]);

    CompanionBehavior.registerFact("world_combat:move_afteryou/preparing", (world, actor) => {
        const body = world.observe(actor);
        const pending = LivingActions.preparing(world, actor).filter(clock => clock.advanced === 0 && clock.remaining > 1);
        return pending.length ? Math.max.apply(null, pending.map(clock => clock.remaining)) : body && body.player() && body.attacking() ? 1 : 0;
    });
    CompanionBehavior.registerUse(afteryouId, {
        protocols: ["world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
            if (target === null) return true;
            const self = CompanionBehavior.source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.status(context, target, afteryouStatus) || !(CompanionBehavior.fact<number>(context, "world_combat:move_afteryou/preparing", target) || 0)) return false;
            return CompanionBehavior.distance(self.point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, _item, target) {
            const self = CompanionBehavior.source(context);
            return target.friendly && target.health > 0 && target.visible && String(target.ref) !== String(self.ref)
                && !CompanionBehavior.status(context, target, afteryouStatus)
                && (CompanionBehavior.fact<number>(context, "world_combat:move_afteryou/preparing", target) || 0) > 0;
        },
        priority: function (context, _item, target) {
            if (target === null) return 0;
            return 42 + Math.min(30, CompanionBehavior.fact<number>(context, "world_combat:move_afteryou/preparing", target) || 0);
        }
    });
}
