/**
 * 换档 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享强化位的随手一放。
 *
 * 什么局面有意义：有威胁但尚未贴身（距离 ≥ ai.minGap），或收到驻守/自主指令身边暂时安全。
 * 什么时候最想出手：威胁在 ai.minGap 之外、ai.maxChase 之内时 priority ≥ 100 抢在共享顺序前——趁还能拉开距离时换好挡。
 * 贴身时交回共享顺序，不为提速站着挨打。
 * 放完之后：既然换的是「追得上也打得动」的挡，伙伴会顺势朝最近的威胁压上去一小段，把新速度用掉。
 */
namespace PokemonSkills {
    function shiftgearThreatDistance(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    function shiftgearAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 30;
        if (context.tick > progress.chaseUntil) return;
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 2);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("shiftgear", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            const gap = shiftgearThreatDistance(context);
            if (gap < 0) return context.facts.intent === "hold" || context.facts.intent === "autonomous";
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        priority: function (context, capability) {
            if (context.facts.intent === "hold") return 0;
            const gap = shiftgearThreatDistance(context);
            if (gap < 0) return 40;
            if (gap <= CompanionBehavior.ai<number>(capability, "minGap", 4)) return 0;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16) ? 110 : 0;
        },
        after: function (context, capability, target, progress) { return shiftgearAfter(context, progress); }
    });

    addPreferences("shiftgear", {}, [
        field(pathOf("gear"), "挡位", "choice", {
            options: [
                { value: 0, label: "扭力档：攻击 +2、速度 +1" },
                { value: 1, label: "超速档：攻击 +1、速度 +2" }
            ],
            help: "两档总量都是 +3 级，只在攻速之间分配：想要打得重选扭力，想要追人抢位选超速。"
        }),
        field(pathOf("ai.maxChase"), "换挡距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内就考虑换挡；越大越早准备，也越可能被打断。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 10, step: 1,
            help: "威胁近于这个距离时不再换挡，直接交回普通次序，不为提速站着挨打。"
        })
    ]);
}
