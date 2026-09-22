/**
 * 缠绕 / constrict 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。这一招伤害很低，价值在控住目标，所以 AI 只在有意义时用它：
 * `ai.preferRunners`（默认开）让正在快速移动或逃跑的目标排得更前——先缠住跑得快的那个；
 * 已经带着 trapped 身份的目标会被跳过（缠住的人再缠一次没有意义）。
 * 对谁出手：当前威胁；正在攻击自己的目标略优先（缠住它再脱离）。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近。
 */
namespace PokemonSkills {
    function constrictValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("constrict", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!constrictValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return constrictValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 14;
            if (CompanionBehavior.status(context, target, "trapped")) score -= 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 18;
                else if (pace >= 0.09) score += 9;
            }
            if (target.attacking === CompanionBehavior.source(context).ref) score += 8;
            return score;
        }
    });

    addPreferences("constrict", {}, [
        field(pathOf("latch"), "攀缠式", "boolean", {
            help: "开启：缠得更久、定得更久、再多压一级速度，但伤害更低，施法者还要分出肢体按住它、自己也一时无法移动。关闭（绞缠式）：一记更重更快的硬绞，束缚与定身更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动伸手，先靠近。这一招是贴身控制，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.preferRunners"), "先缠跑得快的", "boolean", {
            help: "开启：正在快速移动或逃跑的目标优先——先把它按住；关闭：只按威胁与距离排序。"
        })
    ]);
}
