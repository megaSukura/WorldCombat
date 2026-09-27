/** batonpass：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    /** 本招实际能带走几级：读同一份 carry 公式，AI 与执行共享同一顺序。 */
    function batonpassCarry(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const access = world(context), actor = access.actor(source(context).ref);
        if (!actor) return 1;
        return Math.max(1, Math.round(PokemonSkills.p("batonpass", "carry",
            { world: access, actor: actor, skill: PokemonSkills.skills.batonpass, detail: { values: capability.data.config } })));
    }
    /** 接收者按实际转出顺序能拿到的净收益；负收益或没有正向项目时返回 0 分，不递棒。 */
    function batonpassScore(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Entity): number {
        const access = world(context), actor = access.actor(source(context).ref), ally = access.actor(target.ref);
        if (!actor || !ally) return 0;
        const value = PokemonSkills.batonpassValue(access, actor, ally, batonpassCarry(context, capability));
        if (value.gains <= 0) return 0;
        return value.gains - value.losses;
    }

    registerUse("batonpass", {
        protocols: ["world_combat:bolster", "world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(capability, "leaveStation", false)) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = source(context);
            const access = world(context), actor = access.actor(self.ref);
            if (!actor || !PokemonSkills.batonpassCanGive(access, actor, true)) return false;
            if (String(target.ref) === String(self.ref)) return ratio(self) < .5 && !!PokemonSkills.partyReserve(PokemonSkills.partyRoster(access, actor), PokemonSkills.partyActiveId(access, actor));
            if (!target.friendly) return false;
            if (status(context, target, "baton_pass")) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return batonpassScore(context, capability, target) > 0;
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
        priority: function (context, capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            const base = ratio(source(context)) < 0.5 ? 80 : 55;
            if (String(target.ref) === String(source(context).ref)) return base;
            const score = batonpassScore(context, capability, target);
            if (score <= 0) return 0;
            return base + Math.min(20, score * 4);
        }
    });

    const batonpassChase = PokemonSkills.number("ai.maxChase", "递棒距离", 3, 20, 1);
    batonpassChase.help = "队友在这个距离以内才考虑递棒；调小只在贴身时转交，调大愿意主动靠过去。";
    const batonpassLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    batonpassLeave.help = "开启后，收到「驻守」指令时也会离开原位去把棒交给队友。";

    PokemonSkills.addPreferences("batonpass", {}, [batonpassChase, batonpassLeave]);
}
