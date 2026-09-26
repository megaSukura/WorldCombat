/**
 * 寄生种子 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内、中间有一条通视线，而且它身上还没有根、也不是草属性。
 *   自己越缺血越想撒（ai.healBelow），因为抽回来的是实打实的生命。
 * 对谁出手：当前威胁；身上已经有根（任何来源）的目标不重复下手；草属性目标直接跳过（种不活）。
 *   自由瞄准让玩家可以空投，但 AI 仍只挑真实可寄生的敌人，并读通用战斗者类型表而不是只看宝可梦数据。
 * 候选之间怎么排：自己生命低于 ai.healBelow 时抬到 58 先给自己续命，否则 46；priority 0 仍可由共享顺序兜底。
 * 够不到怎么办：reach 就是本招射程（由等级与特攻决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：根留在目标身上自己定时抽取，伙伴交回共享顺序，不再追加动作。
 * 配置 gluttony（贪食／缓吸）改变抽取节奏；ai.maxChase、ai.healBelow 决定追多远、什么时候靠它回血。
 */
namespace PokemonSkills {
    function leechseedWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "leechseed")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        const world = CompanionBehavior.world(context);
        if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        // 草属性身上种不活：读通用战斗者类型表（宝可梦与原版/其他模组生物同一条路），避免白撒一次。
        const actor = world.actor(target.ref);
        if (actor !== null && leechSeedImmune(world, actor)) return false;
        return true;
    }

    function leechseedApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerUse(leechSeedId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : leechseedWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !leechseedWants(context, item, target)) return 0;
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(item, "healBelow", 0.9) ? 58 : 46;
        },
        approach: function (context, _item, target) { return leechseedApproach(context, target); }
    });

    const leechseedChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    leechseedChase.help = "伙伴只在威胁离自己这么远以内时才撒种；调小只在贴身时撒，调大愿意追出去把根种上。";
    const leechseedHeal = field(pathOf("ai.healBelow"), "缺血时优先", "number", { min: 0.3, max: 1, step: 0.05,
        help: "自身生命低于这个比例时，优先撒种续命（58 分）；高于它则按普通控制出手（46 分）。" });
    const leechseedStation = flag("ai.leaveStation", "驻守时允许离位");
    leechseedStation.help = "开启后，收到「驻守」指令时也会离开原位去撒种。";

    addPreferences(leechSeedId, { ai: { maxChase: 13, healBelow: 0.9, leaveStation: false } },
        [leechseedChase, leechseedHeal, leechseedStation]);
}
