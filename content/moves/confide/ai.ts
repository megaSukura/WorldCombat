/** Visible special threats are preferred. After losing sight, only the shared three-second last-seen point is available; no hidden body facts are read. */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("confide", { ai: { maxChase: 12, opening: "anytime", preferSpecial: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.preferSpecial", "优先法系威胁"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function confideWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.memoryAim) {
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
            if (distance(self.point, threat.point) > Math.min(item.data.range, ai<number>(item, "maxChase", 12))) return false;
            return ai<string>(item, "opening", "anytime") !== "targeting" || self.hurtAgo < 40;
        }
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        if (status(context, threat, "confided")) return false;
        if (stage(context, threat, "spa") <= -6) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    /** 看得出目标以特攻输出（特攻高于物攻）时，密语才打中要害；物攻未知不当作特攻手。 */
    function confideSpecialOutput(context: WorldBehavior.Context, threat: Entity): boolean {
        const stats = combatStats(context, threat);
        if (!stats || !stats.stats || typeof stats.stats.spa !== "number" || typeof stats.stats.atk !== "number") return false;
        return stats.stats.spa > stats.stats.atk;
    }

    registerUse("confide", {
        protocols: ["world_combat:control"],
        memoryAim: true,
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || confideWants(context, item, target); },
        accepts: function (_context, _item, target) { return !!target.memoryAim || !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !confideWants(context, item, target)) return 0;
            if (target.memoryAim) return 20;
            const prefer = ai<boolean>(item, "preferSpecial", true);
            if (!prefer) return 34;
            // 已知特殊输出者加分；普通未知攻击只作低优先，把机会先让给更值的目标。
            return confideSpecialOutput(context, target) ? 46 : 20;
        }
    });
}
