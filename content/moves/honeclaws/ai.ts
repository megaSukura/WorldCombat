/**
 * 磨爪 / honeclaws 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase（默认 14）内时先磨一轮再压上去。它是本族最便宜的一支，
 *   所以允许在拉锯中反复补——锋口一掉就会再磨；但命中和物攻都到顶时这一次磨不出任何收益，就不再空磨。
 * 什么时候最想出手：命中被削（命中能力等级为负）时提高优先，先把失手的连击接回来；否则在 ai.minGap
 *   之外 priority 100——抢在共享交战次序前把攻与命中垫起来；已经贴身就让位给普通攻击。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：物攻与命中已写进公共能力阶梯；锋口窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("honeclaws", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "honeclaws")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            // 命中与物攻都到顶：这次磨不出任何收益，不重复空磨。
            if (CompanionBehavior.stage(context, self, "accuracy") >= 6 && CompanionBehavior.stage(context, self, "atk") >= 6) return false;
            return true;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            // 命中被削时更要先补锋口，把失手压回去。
            return CompanionBehavior.stage(context, self, "accuracy") < 0 ? 130 : 100;
        }
    });

    addPreferences("honeclaws", {}, [
        field(pathOf("ai.maxChase"), "磨爪距离", "number", {
            min: 3, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先磨爪；越大越早开始把攻与命中垫起来。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再磨爪、直接攻击；调大更常在近身时放弃磨砺。"
        })
    ]);
}
