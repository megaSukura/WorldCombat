/**
 * 速度互换 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内、中间有一条通视线，且双方身上都没有交换窗口。
 *   值不值得换，看两人的速度比：
 *   互换：对手明显比自己快（比值 ≥ ai.minEdge）时最值（把它的速度整个接过来），抬到 70 抢在攻击前换；
 *     对手明显比自己慢时换过去只会拖累自己，压到 20；差不多时 45，当普通节奏手段。
 *   拉平：比自己快时稳定获益（60），比自己慢时会把自己拉慢（30）。
 * 对谁出手：当前威胁；身上已经有交换窗口的不重复下手。
 * 候选之间怎么排：按上面的速度比给分；priority 0 或负值仍可由共享顺序兜底选中。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：双方的速度换到新位置并维持一段窗口，窗口走完自动换回；伙伴交回共享顺序。
 * 配置 mode（互换／拉平）改变交换方式；ai.maxChase、ai.minEdge 决定追多远、差距多大才值得换。
 */
namespace PokemonSkills {
    function speedswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "speedswap") || CompanionBehavior.status(context, target, "speedswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    function speedswapApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerFact("world_combat:speedswap-rating", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.speedswapRating(PokemonSkills.speedswapReading(access, actor));
    });

    CompanionBehavior.registerUse(speedswapId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : speedswapWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !speedswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mine = CompanionBehavior.fact<number>(context, "world_combat:speedswap-rating", self);
            const theirs = CompanionBehavior.fact<number>(context, "world_combat:speedswap-rating", target);
            if (mine === null || theirs === null || !(mine > 0)) return 45;
            const ratio = theirs / mine, edge = CompanionBehavior.ai<number>(item, "minEdge", 1.15);
            const exchange = !(item.data.config && item.data.config.mode === 0);
            if (exchange) {
                if (ratio >= edge) return 70;
                if (ratio <= 1 / edge) return 20;
                return 45;
            }
            return ratio > 1 ? 60 : 30;
        },
        approach: function (context, _item, target) { return speedswapApproach(context, target); }
    });

    const speedswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    speedswapChase.help = "伙伴只在威胁离自己这么远以内时才换速；调小只在贴身时换，调大愿意追出去把次序倒过来。";
    const speedswapEdge = field(pathOf("ai.minEdge"), "最小差距", "number", { min: 1.0, max: 2.5, step: 0.05,
        help: "速度比（对方 / 自己）达到这个值才按「值得换」处理；调高只对冲得更快的对手出手，避免无意义的来回。" });
    const speedswapStation = flag("ai.leaveStation", "驻守时允许离位");
    speedswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换速。";

    const speedswapMode = field(pathOf("mode"), "交换方式", "choice", {
        options: [{ value: 1, label: "互换" }, { value: 0, label: "拉平" }],
        help: "互换：双方有效速度对调，对方比你快你赚满、比你慢你就亏满，风险对等；拉平：双方都朝中间靠、把差距压一半，稳定可预期，但对方更慢时反而拖累自己。"
    });

    addPreferences(speedswapId, { mode: 1, ai: { maxChase: 12, minEdge: 1.15, leaveStation: false } },
        [speedswapMode, speedswapChase, speedswapEdge, speedswapStation]);
}
