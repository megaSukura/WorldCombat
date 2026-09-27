/** Prioritize unprotected nearby recipients using the actual grant radius; a threat that recently landed a critical is
 *  ranked highest, an ordinary fortify is the base. Each blessing remains portable and keeps its own clock. */
namespace PokemonSkills {
    function luckychantAllyExposed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const world = CompanionBehavior.world(context);
        const radius = p(luckychantId, "chantRadius", { world, actor: world.source(), detail: { values: capability.data.config } });
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (other.ref === self.ref || CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (!CompanionBehavior.status(context, other, luckychantStatus)) return true;
        }
        return false;
    }

    // 近期真正打出过要害的威胁：从实际 damage_applied 回执里记下攻击者，供本招 AI 优先照护。
    var luckychantCritAt: { [ref: string]: number } = Object.create(null);
    WorldCombat.on("world_combat:move_luckychant/witness", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data())), actor = event.actor();
        if (!data || data.critical !== true || !(data.actual > 0) || !actor) return;
        const world = event.world(); if (!world.valid(actor)) return;
        const now = world.tick(), keys = Object.keys(luckychantCritAt);
        for (let i = 0; i < keys.length; i++) if (now - luckychantCritAt[keys[i]] > 400) delete luckychantCritAt[keys[i]];
        luckychantCritAt[String(actor.ref())] = now;
    });
    CompanionBehavior.registerFact("world_combat:luckychant/observed_crit", function (access, actor) {
        const at = luckychantCritAt[String(actor.ref())];
        return typeof at === "number" && access.tick() - at < 200;
    });
    // 已知高暴击威胁：宝可梦本体带抬暴击等级或抬暴击倍率的特性（如超幸运／狙击手），读原生特性数据，无则 false。
    CompanionBehavior.registerFact("world_combat:luckychant/high_crit", function (_access, actor) {
        if (String(actor.domain()) !== "cobblemon") return false;
        const ability = String(CobblemonCombat.pokemon(actor).ability());
        return NativeAbilities.property(ability, "criticalStages", 0) > 0
            || NativeAbilities.property(ability, "criticalMultiplier", 1) > 1.5;
    });

    CompanionBehavior.registerUse(luckychantId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, luckychantStatus) && !luckychantAllyExposed(context, capability)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 15)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") !== "incoming") return true;
            const owner = context.facts.owner;
            return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) {
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (threat && (CompanionBehavior.fact<boolean>(context, "world_combat:luckychant/observed_crit", threat)
                || CompanionBehavior.fact<boolean>(context, "world_combat:luckychant/high_crit", threat))) return 62;
            return luckychantAllyExposed(context, capability) ? 56 : 48;
        }
    });

    addPreferences(luckychantId, { ai: { maxChase: 15, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑起唱；调小只在贴身时唱，调大在更远处就先准备好。" }),
        choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时", "受压时起唱"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
