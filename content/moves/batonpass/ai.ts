/** batonpass：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    registerUse("batonpass", {
        protocols: ["world_combat:bolster", "world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = source(context);
            const access = world(context), actor = access.actor(self.ref);
            if (!actor || !PokemonSkills.batonpassCanGive(access, actor, true)) return false;
            if (String(target.ref) === String(self.ref)) return ratio(self) < .5 && !!PokemonSkills.partyReserve(PokemonSkills.partyRoster(access, actor), PokemonSkills.partyActiveId(access, actor));
            if (!target.friendly) return false;
            if (status(context, target, "baton_pass")) return false;
            return distance(self.point, target.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            if (target.ref === source(context).ref) return true;
            return target.friendly && target.health > 0 && target.visible && !status(context, target, "baton_pass");
        },
        target: function (context, _capability, target) {
            if (target.ref !== source(context).ref) return target;
            // A reserve handoff is the same no-entity input a player can choose; the native roster selects its member.
            const empty: Entity = JSON.parse(JSON.stringify(target)); empty.ref = ""; return empty;
        },
        priority: function (context, _capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            return ratio(source(context)) < 0.5 ? 80 : 55;
        }
    });

    const batonpassChase = PokemonSkills.number("ai.maxChase", "递棒距离", 3, 20, 1);
    batonpassChase.help = "队友在这个距离以内才考虑递棒；调小只在贴身时转交，调大愿意主动靠过去。";
    const batonpassLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    batonpassLeave.help = "开启后，收到「驻守」指令时也会离开原位去把棒交给队友。";

    PokemonSkills.addPreferences("batonpass", {}, [batonpassChase, batonpassLeave]);
}
