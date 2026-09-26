/**
 * 速度互换 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁或可帮的慢队友、离自己不超过 ai.maxChase、中间有一条通视线，且双方身上都没有交换窗口。
 *   值不值得换，看两人有效原生移动速度的比值（对方 / 自己），这是这一招真正的收益大小：
 *   换：对手明显更快（比值 ≥ ai.minEdge）时最值（把它的速度整个接过来），抬到 70 抢在攻击前换；
 *     对手更慢时换过去只会白送速度，拒绝；差不多但仍有差时按普通节奏处理（40）。
 *   拉平：比自己快时稳定获益（60），比自己慢时等于替对方加速，拒绝。
 *   队友：ai.helpFriends 开启时，比自己明显慢（比值 ≤ 1 / ai.minEdge）的队友能接走自己的快节奏；
 *     它正在交战或刚受伤、确实需要追击时给 55，否则 30。比自己快的队友不吃这一份。
 * 对谁出手：当前威胁，或需要追击的慢队友；身上已经有交换窗口的不重复下手。
 * 候选之间怎么排：按上面的速度比给分；priority 0 或负值仍可由共享顺序兜底选中。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：双方的实际速度换到对方原来的位置并维持一段窗口，窗口走完自动换回；伙伴交回共享顺序。
 * 配置 mode（互换／拉平）改变交换方式；ai.maxChase、ai.minEdge 决定追多远、差距多大才值得；
 *   ai.helpFriends 决定是否把队友也纳入可换对象。
 */
namespace PokemonSkills {
    /** 对方相对自己的有效速度比（对方 / 自己）；任一端读不到速度返回 null。 */
    function speedswapRatio(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number | null {
        const self = CompanionBehavior.source(context);
        const mine = CompanionBehavior.fact<number>(context, "world_combat:speedswap-rating", self);
        const theirs = CompanionBehavior.fact<number>(context, "world_combat:speedswap-rating", target);
        if (mine === null || theirs === null || !(mine > 0) || !(theirs > 0)) return null;
        return theirs / mine;
    }

    function speedswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (String(target.ref) === String(self.ref)) return false;
        if (CompanionBehavior.status(context, self, "speedswap") || CompanionBehavior.status(context, target, "speedswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const ratio = speedswapRatio(context, item, target);
        if (ratio === null) return false;
        const edge = Math.max(1.01, CompanionBehavior.ai<number>(item, "minEdge", 1.15));
        if (target.friendly) {
            if (!CompanionBehavior.ai<boolean>(item, "helpFriends", true)) return false;
            return ratio <= 1 / edge;
        }
        const exchange = !(item.data.config && item.data.config.mode === 0);
        return exchange ? ratio >= edge : ratio > 1.05;
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
        return PokemonSkills.speedswapRating(access, actor);
    });

    CompanionBehavior.registerUse(speedswapId, {
        // 敌方走 control（威胁），慢队友走 bolster（支援）；两者都在这一招自己的 accepts/priority 里区分。
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            return speedswapWants(context, item, target);
        },
        accepts: function (context, _item, target) {
            const self = CompanionBehavior.source(context);
            return String(target.ref) !== String(self.ref) && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (target === null || !speedswapWants(context, item, target)) return 0;
            const ratio = speedswapRatio(context, item, target);
            if (ratio === null) return 0;
            const edge = Math.max(1.01, CompanionBehavior.ai<number>(item, "minEdge", 1.15));
            if (target.friendly) return ratio <= 1 / edge ? (target.attacking || target.hurtAgo < 60 ? 55 : 30) : 0;
            const exchange = !(item.data.config && item.data.config.mode === 0);
            if (exchange) return ratio >= edge ? 70 : 40;
            return ratio > 1.05 ? 60 : 0;
        },
        approach: function (context, _item, target) { return speedswapApproach(context, target); }
    });

    const speedswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    speedswapChase.help = "伙伴只在威胁或队友离自己这么远以内时才换速；调小只在贴身时换，调大愿意追出去把次序倒过来。";
    const speedswapEdge = field(pathOf("ai.minEdge"), "最小差距", "number", { min: 1.0, max: 2.5, step: 0.05,
        help: "速度比（对方 / 自己）达到这个值才按「值得换」处理：更快敌人借速、更慢队友赠速。调高只对差距更大的对象出手，避免无意义的来回。" });
    const speedswapStation = flag("ai.leaveStation", "驻守时允许离位");
    speedswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换速。";
    const speedswapFriends = flag("ai.helpFriends", "援助队友");
    speedswapFriends.help = "开启后，比自己明显慢、需要追击的队友也会成为可换对象（把快节奏借出去）；关闭则只对敌人用。";

    const speedswapMode = field(pathOf("mode"), "交换方式", "choice", {
        options: [{ value: 1, label: "互换" }, { value: 0, label: "拉平" }],
        help: "互换：双方有效移动速度对调，对方比你快你赚满、比你慢你就亏满，风险对等；拉平：双方都朝中间靠、把差距压一半，稳定可预期，但对方更慢时反而拖累自己。"
    });

    addPreferences(speedswapId, { mode: 1, ai: { maxChase: 12, minEdge: 1.15, leaveStation: false, helpFriends: true } },
        [speedswapMode, speedswapChase, speedswapEdge, speedswapStation, speedswapFriends]);
}
