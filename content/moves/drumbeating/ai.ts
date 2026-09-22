/**
 * 鼓击 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。它是一记远程的地面连奏，价值在于隔着一段距离把对手钉住。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。`ai.pinRunners` 开启时，正在移动或逃跑的目标优先。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；这是一记地面招式，不负责贴脸。
 * 放完之后：末拍目标被 rootbound、速度等级下降、脚下留下根须，交回共享顺序继续战斗。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("drumbeating", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 17;
            if (CompanionBehavior.ai<boolean>(capability, "pinRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 14;
                else if (pace >= 0.09) score += 7;
            }
            if (CompanionBehavior.status(context, target, "rootbound")) score -= 14;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("drumbeating", {}, [
        field(pathOf("deep"), "深根", "boolean", {
            help: "开启：根留得更久、多压一级速度、破土更宽，但每拍更轻、冷却更久。关闭：更重更快的一轮连奏。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动敲鼓，先走近。越大越愿意从更远处先手钉人。"
        }),
        field(pathOf("ai.pinRunners"), "先钉跑得快的", "boolean", {
            help: "开启：目标正在移动或逃跑时优先出手，先把它的速度压下来；关闭：当普通中距离候选排序。"
        })
    ]);
}
