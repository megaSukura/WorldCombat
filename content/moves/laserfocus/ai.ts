/**
 * 磨砺 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、进入 ai.maxChase 内、身上还没有同一层锐意；物攻型个体最值得先磨这一下。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 96 越过共享交战次序先磨好；物攻不低于特攻时抬到 104
 *   （靠物理输出吃满必中要害的个体优先替它铺好）；已经贴身就让位给普通攻击，不为强化站着挨打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（reach 0，accepts 只收自己）。
 * 放完之后：锐意留在身上、下一击兑现即散；窗口还在时不再重复磨砺。
 * 配置：ai.maxChase 限制考虑距离；ai.minGap 决定多近放弃强化；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("laserfocus", { ai: { maxChase: 14, minGap: 3, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function laserfocusWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, self, "laserfocus")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return distance(self.point, threat.point) >= ai<number>(item, "minGap", 3);
    }

    registerUse("laserfocus", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, _purpose, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            return !!threat && laserfocusWants(context, item, threat);
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || !laserfocusWants(context, item, threat)) return 0;
            const physical = (context.facts.attack || 0) >= (context.facts.specialAttack || 0);
            return physical ? 104 : 96;
        }
    });
}
