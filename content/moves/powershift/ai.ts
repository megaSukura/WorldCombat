/**
 * 力量转换 / powershift 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、在 ai.maxChase（默认 14）内、还没贴身，而且自己现成的攻防差距够大
 *   （max/min ≥ ai.minEdge，默认 1.15）时才值得换——差距太小换过去没有意义。已经在转换中就不再重复。
 * 什么时候最想出手：满足以上条件时 priority 100，抢在共享交战次序前换好形态；贴身就让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：数值已经换过来（宝可梦走临时属性层），窗口内不再重复；窗口走完自动换回，再看局面。
 * 配置 hold（维持）改变窗口与冷却；ai.minEdge 决定差距多小就不值得换。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：一个宝可梦当前攻防的差距比（大值 / 小值）。 */
    CompanionBehavior.registerFact("world_combat:move_powershift/edge", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return 0;
        const state = NativeEffects.read(access, actor), pokemon = CobblemonCombat.pokemon(actor);
        const attack = NativeEffects.stat(pokemon, state, "atk"), defence = NativeEffects.stat(pokemon, state, "def");
        const low = Math.max(1, Math.min(attack, defence));
        return Math.max(attack, defence) / low;
    });

    CompanionBehavior.registerUse("powershift", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (CompanionBehavior.status(context, self, "powershift")) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            const edge = CompanionBehavior.fact<number>(context, "world_combat:move_powershift/edge", self);
            if (edge === null || edge < CompanionBehavior.ai<number>(capability, "minEdge", 1.15)) return false;
            return CompanionBehavior.distance(self.point, threat.point) >= CompanionBehavior.ai<number>(capability, "minGap", 3);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, _capability, _target) {
            return context.senses["world_combat:threat"] ? 100 : 0;
        }
    });

    addPreferences("powershift", {}, [
        field(pathOf("ai.maxChase"), "转换距离", "number", {
            min: 3, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑转换；越大越早把形态换好。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再转换、直接应对；调大更常在近身时放弃转换。"
        }),
        field(pathOf("ai.minEdge"), "最小差距", "number", {
            min: 1.0, max: 2.0, step: 0.05,
            help: "攻防差距（大值 / 小值）小于它就不转换；调高只在高攻或高防的极端个体上才换，避免无意义的来回。"
        })
    ]);
}
