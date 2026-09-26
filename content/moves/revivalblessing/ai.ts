/** Uses the actual owner roster, independent of where the individual fainted. */
namespace CompanionBehavior {
    registerUse("revivalblessing", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (ai<boolean>(capability, "combatOnly", false) && !context.senses["world_combat:threat"]) return false;
            const reach = typeof capability.data.range === "number" && capability.data.range > 0 ? capability.data.range : 6;
            const access = world(context), actor = access.actor(source(context).ref);
            return !!actor && !!PokemonSkills.revivalblessingMember(access, actor, reach);
        },
        accepts: function (context, _capability, target) {
            return String(target.ref) === String(source(context).ref);
        },
        approachTarget: function (context) { return source(context); },
        priority: function () { return 72; }
    });

    const revivalblessingCombat = PokemonSkills.flag("ai.combatOnly", "只在交战中祈祷");
    revivalblessingCombat.help = "开启：只在自己正面对威胁时才会为倒下的伙伴祈祷；关闭（默认）：看到伙伴倒下就回应，哪怕暂时脱战。";

    PokemonSkills.addPreferences("revivalblessing", {}, [revivalblessingCombat]);
}
