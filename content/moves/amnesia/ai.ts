/**
 * 瞬间失忆 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己身上缠着混乱、着迷、挑衅、无理取闹、被点名一类心智异常时，任何时候都值得立刻忘掉——
 *   即使空明窗口还在（窗口只护特防，新缠上的精神干扰仍要清）；没有缠绕时，才考虑用纯特防窗口整备，
 *   此时若窗口已在就不重复。仍服从招式正常出手限制，不为清挑衅凭空免疫所有控制。
 * 什么时候最想出手：带心智异常时 priority 112 越过共享交战次序——先把状态清掉；否则威胁还在 ai.minGap
 *   之外时 100；已经贴身就让位给普通应对。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特防等级已写进公共能力阶梯（载体窗口拥有）；缠绕已清则窗口内也可再施放清下一个。
 */
namespace PokemonSkills {
    /** 自己身上有没有缠着心智的共享状态；名单与 skill.ts 的忘却名单一致。 */
    function amnesiaAfflicted(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const names = ["confusion", "attract", "taunt", "torment", "encore", "disable"];
        for (let index = 0; index < names.length; index++) {
            if (CompanionBehavior.status(context, target, names[index])) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("amnesia", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            const afflicted = amnesiaAfflicted(context, self);
            // 只有纯特防窗口已经在时才不重复；新缠上的精神干扰仍优先清。
            if (CompanionBehavior.status(context, self, "amnesia") && !afflicted) return false;
            if (afflicted) return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const self = CompanionBehavior.source(context);
            if (amnesiaAfflicted(context, self)) return 112;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            return 100;
        }
    });

    addPreferences("amnesia", {}, [
        field(pathOf("ai.maxChase"), "放空距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先放空；越大越早开始垫特防。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再失忆、直接应对；调大更常在近身时放弃强化。"
        })
    ]);
}
