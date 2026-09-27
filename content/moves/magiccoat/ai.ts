/** Reflect known status threats; ordinary melee pressure alone does not make a film useful. */
namespace PokemonSkills {
    function magiccoatPressured(context: WorldBehavior.Context): boolean {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
        if (!threat) return false;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
    }

    CompanionBehavior.registerFact("world_combat:move_magiccoat/threat", (access, actor) => magiccoatThreat(access, actor));
    CompanionBehavior.registerUse(magiccoatId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (!CompanionBehavior.fact<boolean>(context, "world_combat:move_magiccoat/threat", threat)) return false;
            const world = CompanionBehavior.world(context);
            const reach = typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range
                : PokemonSkills.p(magiccoatId, "coatReach", { world: world, actor: world.source(), skill: skills[magiccoatId],
                    detail: { values: item.data.config } });
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) > Math.min(CompanionBehavior.ai<number>(item, "maxChase", 14), Math.max(0, reach))) return false;
            if (CompanionBehavior.ai<string>(item, "opening", "anytime") !== "anytime") return magiccoatPressured(context);
            return true;
        },
        accepts: function (context, _item, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, item) { return magiccoatPressured(context) ? 100 : 46; }
    });

    const magiccoatChase = number("ai.maxChase", "考虑距离", 4, 26, 1);
    magiccoatChase.help = "伙伴只在威胁离自己这么远以内时才撑膜；实际反射距离是本招自己算出的上限，这个值再收紧时只在更近处撑，调大则允许在射程内先备好。";
    const magiccoatOpening = choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时", "受压时撑膜"]);
    magiccoatOpening.help = "随时：确认对手会施加异常时撑膜；受压时撑膜：已确认异常威胁，且自己或主人正受压时撑。";
    const magiccoatStation = flag("ai.leaveStation", "驻守时允许离位");
    magiccoatStation.help = "开启后，收到「驻守」指令时也会离开原位去撑膜。";

    addPreferences(magiccoatId, { ai: { maxChase: 14, opening: "anytime", leaveStation: false } },
        [magiccoatChase, magiccoatOpening, magiccoatStation]);
}
