/** Compare current stage advantages; opt-in support shares the caster's advantage with an ally. */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:guardswap-guard", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.guardswapGuard(access, actor);
    });

    function guardswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "guardswap") || CompanionBehavior.status(context, target, "guardswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const mine = CompanionBehavior.fact<number>(context, "world_combat:guardswap-guard", self);
        const theirs = CompanionBehavior.fact<number>(context, "world_combat:guardswap-guard", target);
        if (mine === null || theirs === null) return false;
        return target.friendly ? CompanionBehavior.ai<boolean>(item, "share", false) && mine - theirs >= CompanionBehavior.ai<number>(item, "margin", 1) : theirs - mine >= CompanionBehavior.ai<number>(item, "margin", 1);
    }

    function guardswapApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerUse("guardswap", {
        protocols: ["world_combat:attack", "world_combat:support"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || guardswapWants(context, item, target); },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !guardswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mine = CompanionBehavior.fact<number>(context, "world_combat:guardswap-guard", self);
            const theirs = CompanionBehavior.fact<number>(context, "world_combat:guardswap-guard", target);
            if (mine === null || theirs === null) return 45;
            const gain = target.friendly ? mine - theirs : theirs - mine;
            return Math.max(1, Math.min(100, Math.round(45 + gain * 8)));
        },
        approach: function (context, _item, target) { return guardswapApproach(context, target); }
    });

    const guardswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    guardswapChase.help = "伙伴只在威胁离自己这么远以内时才换守；调小只在贴身时换，调大愿意追出去把防线接走。";
    const guardswapMargin = number("ai.margin", "换守下限", 0, 6, 1);
    guardswapMargin.help = "对方的守势等级之和（防 + 特防）要比自己高出这么多级才出手；调大更挑剔，调小更常出手。";
    const guardswapStation = flag("ai.leaveStation", "驻守时允许离位");
    guardswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换守。";

    addPreferences("guardswap", { ai: { maxChase: 12, margin: 1, leaveStation: false, share: false } },
        [guardswapChase, guardswapMargin, guardswapStation, flag("ai.share", "向伙伴分享")]);
}
