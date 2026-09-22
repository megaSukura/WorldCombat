/**
 * 无理取闹 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、存活、敌对的对手，它在 ai.maxChase 以内，且有一条通视直线——取笑喊不进墙后；
 *   已经带着烦躁身份的目标跳过，不重复取笑。
 * 对谁出手：当前威胁；`ai.opening` 默认只在对手正要出手 / 刚打过自己 / 自己刚挨打时才取笑，纯扰动时选“随时”。
 * 候选之间怎么排：对手正在抬手时优先（压住它的下一拍），其余按普通控制排序；priority 0 仍可由共享顺序兜底。
 * 够不到怎么办：reach 就是本招射程（特攻与体型决定），accepts 不按距离硬拒，共享任务先走近到通视射程。
 * 放完之后：交回共享交战计划；烦躁会自己钉住对手的重复。
 * 配置 manner（讥讽／怒斥）改变射程、时长、起手与冷却；ai.maxChase、ai.opening、ai.leaveStation 决定追多远、何时喊、驻守时是否离位。
 */
namespace PokemonSkills {
    function tormentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, tormentStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
        if (CompanionBehavior.ai<string>(item, "opening", "opening") !== "opening") return true;
        const owner = context.facts.owner;
        return target.attacking === self.ref || !!owner && target.attacking === owner.ref || self.hurtAgo < 40;
    }

    CompanionBehavior.registerUse(tormentId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return target === null ? true : tormentWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !tormentWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 52 : 42;
        }
    });

    addPreferences(tormentId, { manner: 1, ai: { maxChase: 14, opening: "opening", leaveStation: false } }, [
        field(pathOf("manner"), "取笑方式", "choice", {
            options: [{ value: 1, label: "讥讽" }, { value: 0, label: "怒斥" }],
            help: "讥讽：烦躁更久、喊得更远，但起手慢 2 刻、冷却 ×1.15；怒斥：更快、更省，但烦躁更短、喊得更近。"
        }),
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        choice("ai.opening", "出手时机", ["opening", "anytime"], ["只在对手要出手时", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
