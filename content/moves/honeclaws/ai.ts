/**
 * 磨爪 / honeclaws 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase（默认 14）内时先磨一轮再压上去；没有威胁时只在整备命令
 *   （驻守／自主／工作）下随手磨一次。它是本族最便宜的一支，所以允许在拉锯中反复补——锋口一掉就会再磨。
 * 什么时候最想出手：威胁还在 ai.minGap（默认 2）之外时 priority 100——抢在共享交战次序前把攻与命中垫起来；
 *   已经贴身就让位给普通攻击，不为磨爪站着挨打。
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
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 2) ? 0 : 100;
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
