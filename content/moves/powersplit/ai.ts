/**
 * 力量平分 / powersplit —— AI 用途。
 *
 * 什么局面下出手：目标是可见、还活着的活体，在 ai.maxChase（默认 12）格内，且双方身上都没有平分窗口。
 *   值不值得平看攻势底子之和（攻 + 特攻的原始值）：对敌人，对方比自己高出至少 ai.edge 倍（默认 1.15）才出手——
 *   平完两人都落在同一个平均刻度上，差距越大你赚得越多；差距越大排序越靠前。
 *   对伙伴，默认不动；开启 ai.share 后，自己高出伙伴至少 ai.edge 倍时才把自己的余量分过去，把主攻抬起来。
 *   自己反而更高又不分享时不参与候选（多半会被拉低），交给其他招；只剩本招时也不硬放。
 * 对谁出手：活着的可见目标；敌人按攻击用途拆攻，伙伴按支援用途共享。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：两人落在同一刻度上并维持一段长窗口，窗口走完各自回到原来的底子；伙伴交回共享顺序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:powersplit-power", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.powersplitPower(access, actor);
    });

    function powersplitWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "powersplit") || CompanionBehavior.status(context, target, "powersplit")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const mine = CompanionBehavior.fact<number>(context, "world_combat:powersplit-power", self);
        const theirs = CompanionBehavior.fact<number>(context, "world_combat:powersplit-power", target);
        if (mine === null || theirs === null) return false;
        const edge = CompanionBehavior.ai<number>(item, "edge", 1.15);
        return target.friendly
            ? CompanionBehavior.ai<boolean>(item, "share", false) && mine >= Math.max(1, theirs) * edge
            : theirs >= Math.max(1, mine) * edge;
    }

    function powersplitApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerUse("powersplit", {
        protocols: ["world_combat:attack", "world_combat:support"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || powersplitWants(context, item, target); },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !powersplitWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mine = CompanionBehavior.fact<number>(context, "world_combat:powersplit-power", self);
            const theirs = CompanionBehavior.fact<number>(context, "world_combat:powersplit-power", target);
            if (mine === null || theirs === null) return 45;
            const edge = target.friendly ? mine / Math.max(1, theirs) : theirs / Math.max(1, mine);
            return Math.max(1, Math.min(100, Math.round(40 + (edge - 1) * 40)));
        },
        approach: function (context, _item, target) { return powersplitApproach(context, target); }
    });

    const powersplitChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    powersplitChase.help = "伙伴只在威胁离自己这么远以内时才平分；调小只在贴身时平，调大愿意追出去把差距抹掉。";
    const powersplitEdge = field(pathOf("ai.edge"), "平分下限", "number", { min: 1.0, max: 2.5, step: 0.05,
        help: "对方的攻势底子之和要达到自己的这个倍数才出手；分享给伙伴时同样要求自己高到这个倍数。调高更挑剔，只在差距明显时平。" });
    const powersplitStation = flag("ai.leaveStation", "驻守时允许离位");
    powersplitStation.help = "开启后，收到「驻守」指令时也会离开原位去平分。";

    addPreferences("powersplit", { ai: { maxChase: 12, edge: 1.15, leaveStation: false, share: false } },
        [powersplitChase, powersplitEdge, powersplitStation, flag("ai.share", "向伙伴分享")]);
}
