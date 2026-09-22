/**
 * 聚气 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、进入 ai.maxChase 内、且身上还没有吐纳身份（也没有龙声鼓舞，原生两者互斥）；
 *   它是一段越久越深的窗口，最值得在开打前先吸一口。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 100 越过共享交战次序先聚好；已经贴身就让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（reach 0，accepts 只收自己）。
 * 放完之后：吐纳留在身上、每次命中按已深化比例兑现；窗口还在时不再重复聚气。
 * 配置：ai.maxChase 限制考虑距离；ai.minGap 决定多近放弃聚气；深呼吸／浅呼吸改变强度与节奏。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("focusenergy", { ai: { maxChase: 14, minGap: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 26, 1),
        PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function focusenergyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, self, "focusenergy") || status(context, self, "dragoncheer")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return distance(self.point, threat.point) >= ai<number>(item, "minGap", 2);
    }

    registerUse("focusenergy", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, _purpose, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            return !!threat && focusenergyWants(context, item, threat);
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || !focusenergyWants(context, item, threat)) return 0;
            return 100;
        }
    });
}
