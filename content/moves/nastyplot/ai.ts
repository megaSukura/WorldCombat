/**
 * 诡计 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个真实威胁进入 ai.maxChase 内、且还没贴身到 ai.minGap 以内（留出起手空档）时，才值得
 *   停下来盘一算计。空地没有对手时不循环施放——玩家可以战前手动先垫，AI 不空转。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 越过共享交战次序；特攻不低于物攻时再优先一档——
 *   以特殊攻击为主的个体最能吃满这条毒计。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特攻等级已写进公共能力阶梯（载体窗口拥有）；诡计窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("nastyplot", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "nastyplot")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            const focused = (context.facts.specialAttack || 0) >= (context.facts.attack || 0);
            return focused ? 106 : 98;
        }
    });

    addPreferences("nastyplot", {}, [
        field(pathOf("ai.maxChase"), "算计距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑起念；越大越早开始算计。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再算计、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
