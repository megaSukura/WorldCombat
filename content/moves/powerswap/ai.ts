/**
 * 力量互换 / powerswap —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，在 ai.maxChase（默认 12）格内，且双方身上都没有交换窗口；
 *   值不值得换看攻势等级之和（攻 + 特攻）：对方比自己高出至少 ai.margin（默认 1 级）才出手——
 *   换完你接走他攒起来的那几级，他接过你的；差距越大排序越靠前。
 * 自己反而更高时不参与候选（多半会把好势头送出去），交给其他招；只剩本招时也不硬放。
 * 对谁出手：非友方、活着、可见的目标；不需要贴身，换势在射程内直接生效。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：两人攻势等级换到新位置并维持一段窗口，窗口走完自动换回；伙伴交回共享顺序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:powerswap-offence", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.powerswapOffence(access, actor);
    });

    function powerswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "powerswap") || CompanionBehavior.status(context, target, "powerswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const mine = CompanionBehavior.fact<number>(context, "world_combat:powerswap-offence", self);
        const theirs = CompanionBehavior.fact<number>(context, "world_combat:powerswap-offence", target);
        if (mine === null || theirs === null) return false;
        return theirs - mine >= CompanionBehavior.ai<number>(item, "margin", 1);
    }

    function powerswapApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerUse("powerswap", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || powerswapWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !powerswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mine = CompanionBehavior.fact<number>(context, "world_combat:powerswap-offence", self);
            const theirs = CompanionBehavior.fact<number>(context, "world_combat:powerswap-offence", target);
            if (mine === null || theirs === null) return 45;
            const gain = theirs - mine;
            return Math.max(1, Math.min(100, Math.round(45 + gain * 8)));
        },
        approach: function (context, _item, target) { return powerswapApproach(context, target); }
    });

    const powerswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    powerswapChase.help = "伙伴只在威胁离自己这么远以内时才换势；调小只在贴身时换，调大愿意追出去把气势接走。";
    const powerswapMargin = number("ai.margin", "换势下限", 0, 6, 1);
    powerswapMargin.help = "对方的攻势等级之和要比自己高出这么多级才出手；调大更挑剔，只在对方强化成型时换，调小更常出手。";
    const powerswapStation = flag("ai.leaveStation", "驻守时允许离位");
    powerswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换势。";

    addPreferences("powerswap", { ai: { maxChase: 12, margin: 1, leaveStation: false } },
        [powerswapChase, powerswapMargin, powerswapStation]);
}
