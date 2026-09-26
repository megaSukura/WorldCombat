/**
 * 剑舞 / swordsdance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、且有交战需求时，先磨一轮再打。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时 priority 105——这支舞会自己往前压，正好用来切进对手身边，
 *   所以它越过共享交战次序抢先发动；已经贴身（小于 minGap）就让位给普通攻击，不为强化站着挨打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。会给动作一个指向威胁的明确瞄向，让前压朝真实对手走。
 * 放完之后：物攻 +2、身上挂着磨刃窗口；窗口还在时不再重复起舞，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("swordsdance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            // 已有窗口但物攻确实还没到上限时，允许再起舞把等级续满；已满则让位。
            if (CompanionBehavior.status(context, self, "swordsdance") && CompanionBehavior.stage(context, self, "atk") >= 6) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        // 自施放只借这个对象定出前压方向，宿主仍以自身为动作实体。
        target: function (context) {
            return context.senses["world_combat:threat"];
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 0 : 105;
        }
    });

    addPreferences("swordsdance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先起舞；越大越早开始磨刃。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
