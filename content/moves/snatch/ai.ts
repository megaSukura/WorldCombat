/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace PokemonSkills {
    interface SnatchRead { id: string; tick: number; }

    /** 目标最近一次真正提交的招式（只读、决策内缓存）；读不到给 null。 */
    function snatchLastOf(context: WorldBehavior.Context, target: CompanionBehavior.Entity): SnatchRead | null {
        const raw = CompanionBehavior.fact<string>(context, "world_combat:snatch-last", target);
        if (!raw) return null;
        try {
            const value = JSON.parse(raw);
            return value && typeof value.id === "string" ? { id: String(value.id), tick: Number(value.tick) } : null;
        } catch (error) { return null; }
    }

    function snatchWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        if (CompanionBehavior.ai<string>(item, "opening", "setup") === "anytime") return true;
        const last = snatchLastOf(context, target);
        if (last && context.tick - last.tick < 200 && snatchStealable(last.id)) return true;
        return !!CompanionBehavior.fact<boolean>(context, "world_combat:snatch-opportunity", target);
    }

    function snatchApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const here = CompanionBehavior.point(self.point), there = CompanionBehavior.point(target.point);
        if (access.clear(here, there)) return null;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / length, pz = dx / length;
        const options = [[self.point[0] + px * 3, self.point[1], self.point[2] + pz * 3],
            [self.point[0] - px * 3, self.point[1], self.point[2] - pz * 3]];
        for (let i = 0; i < options.length; i++) if (access.clear(CompanionBehavior.point(options[i]), there)) return options[i];
        return null;
    }

    CompanionBehavior.registerFact("world_combat:snatch-opportunity", (world, actor) => snatchOpportunity(world, actor));
    CompanionBehavior.registerFact("world_combat:snatch-last", function (access: CombatWorld, actor: CombatActor): string {
        return JSON.stringify(NativeEffects.lastMove(access, actor));
    });

    CompanionBehavior.registerUse(snatchId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : snatchWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !snatchWants(context, item, target)) return 0;
            const last = snatchLastOf(context, target);
            if (last && snatchStealable(last.id)) return 70;
            return target.attacking ? 40 : 55;
        },
        approach: function (context, _item, target) { return snatchApproach(context, target); }
    });

    const snatchChase = number("ai.maxChase", "考虑距离", 4, 28, 1);
    snatchChase.help = "伙伴只在威胁离自己这么远以内时才探手；调小只在贴身时夺，调大愿意追出去等着抢。";
    const snatchOpening = choice("ai.opening", "出手时机", ["setup", "anytime"], ["等它要加东西", "随时"]);
    snatchOpening.help = "等它要加东西：只在对手有可抢的配招或近期确实获得增益时探手；随时：见威胁就探，当纯投机。";
    const snatchStation = flag("ai.leaveStation", "驻守时允许离位");
    snatchStation.help = "开启后，收到「驻守」指令时也会离开原位去探手。";

    addPreferences(snatchId, { ai: { maxChase: 14, opening: "setup", leaveStation: false } },
        [snatchChase, snatchOpening, snatchStation]);
}
