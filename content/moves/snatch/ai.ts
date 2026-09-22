/**
 * 抢夺 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内、中间有一条通视线，而且它手上有可夺的下一手。
 *   ai.opening=准备时（默认）只在对手最近一次出手本身就是可夺的自我变化招、或它此刻没有在攻击时探手——
 *   这两种情况最像「它正要给自己加东西」；=随时时见威胁就探，当纯投机手段。
 * 对谁出手：当前威胁（本招需要指定一名对手张手）。
 * 候选之间怎么排：读出对手最近一次出手可夺时抬到 70，正闲着酝酿时 55，其余 40；priority 0 仍可由共享顺序兜底。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：夺到的招式由它自己结算；本招不追加动作，交回共享顺序。
 * 配置 patient（屏息／急取）改变窗口与出手节奏；ai.maxChase、ai.opening 决定追多远、什么时候探手。
 */
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
        if (last && snatchStealable(last.id)) return true;
        // 还没读到过它出什么，或它此刻没有在攻击：都可能是正要给自己加东西，值得探手一试。
        return !last || !target.attacking;
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
    snatchOpening.help = "等它要加东西：只在对手最近一次出手可夺、或它此刻没在攻击时才探手；随时：见威胁就探，当纯投机。";
    const snatchStation = flag("ai.leaveStation", "驻守时允许离位");
    snatchStation.help = "开启后，收到「驻守」指令时也会离开原位去探手。";

    addPreferences(snatchId, { ai: { maxChase: 14, opening: "setup", leaveStation: false } },
        [snatchChase, snatchOpening, snatchStation]);
}
