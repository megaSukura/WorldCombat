/**
 * 绑紧 / bind 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase`（默认 7）之内；目标还没被拴住
 * （带着 `partiallytrapped` 身份的不再重复放——绳已经拴上了）。`ai.minHealth`（默认 0.3）是**保留生命**：
 * 自己生命低于这个比例、目标还没残时不出手——拴绳会把自己也拖慢，低血时共慢很危险。
 * 对谁出手：`ai.preferRunners`（默认开）让正在快速移动或正在逃跑的目标排得更前——绳的价值就在于不让它跑；
 * 正在攻击自己的目标再加一档（拴住它再脱离）。焦点目标另加一档。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；绳够到后由每刻回拽把人留在身边。
 */
namespace PokemonSkills {
    function bindValid(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !CompanionBehavior.status(context, target, "partiallytrapped");
    }

    /** 低血时不再为了拴人而让自己一起变慢，除非目标已经残到值得换。 */
    function bindCanAfford(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.3);
        return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || CompanionBehavior.ratio(target) <= 0.35;
    }

    CompanionBehavior.registerUse("bind", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!bindValid(context, target)) return false;
            if (!bindCanAfford(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) { return bindValid(context, target); },
        priority: function (context, capability, target) {
            if (!target || !bindValid(context, target)) return 0;
            if (!bindCanAfford(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 18;
                else if (pace >= 0.09) score += 9;
            }
            if (CompanionBehavior.fleeing(context, target)) score += 20;
            if (target.attacking === CompanionBehavior.source(context).ref) score += 8;
            if (context.facts.focus === target.ref) score += 12;
            return score;
        }
    });

    addPreferences("bind", {}, [
        field(pathOf("choke"), "勒紧式", "boolean", {
            help: "开启：绳更短、每勒加紧更快、回拽更狠、留得更久，但基础威力更低、冷却更久，目标被死死拖在脚边；关闭（牵引式）：绳更长、加紧更缓、威力满值，宽容地牵着走，自己也松快些。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动甩绳，先走近。绳够不到就会甩空，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.preferRunners"), "先拴跑得快的", "boolean", {
            help: "开启：正在快速移动或逃跑的目标优先——先用绳拽住它；关闭：只按威胁与距离排序。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动甩绳（除非目标已残）：拴绳会把自己也拖慢，低血时共慢很危险。调高越珍惜自己，也越少去缠残血目标。"
        })
    ]);
}
