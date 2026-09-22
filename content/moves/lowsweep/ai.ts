/**
 * 下盘踢 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内。它是一记贴身快扫，价值在于把高速对手的速度削下来。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。`ai.cutRunners` 开启时，正在快速移动的目标优先（掉速更深）。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；它不负责远程。
 * 放完之后：目标小腿 hobbled、速度等级下降，交回共享交战计划。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("lowsweep", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "cutRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 16;
                else if (pace >= 0.09) score += 8;
            }
            if (CompanionBehavior.status(context, target, "hobbled")) score -= 12;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("lowsweep", {}, [
        field(pathOf("whirl"), "旋身扫", "boolean", {
            help: "开启：扫击弧线更开、能把高速目标的腿别住更久，但单点更轻、收招与冷却更久。关闭：一记更快更重的小弧点切。"
        }),
        field(pathOf("ai.maxChase"), "贴身距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手进入这个距离内才考虑低扫；调大愿意主动贴上去，调小只在近身时出手。"
        }),
        field(pathOf("ai.cutRunners"), "先削跑得快的", "boolean", {
            help: "开启：目标正在快速移动时优先出手（掉速更深）；关闭：当普通近身候选排序。"
        })
    ]);
}
