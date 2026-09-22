/**
 * 泥巴射击 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。它是一记中距离、必定掉速的糊腿，价值在于先把跑得快的对手压住。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。`ai.crippleRunners` 开启时，正在快速移动的目标优先。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；这是一记平射，不负责远程压制。
 * 放完之后：目标腿脚被 mired、速度等级下降，交回共享顺序继续战斗。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("mudshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            let score = gap <= 4 ? 20 : 15;
            if (CompanionBehavior.ai<boolean>(capability, "crippleRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 14;
                else if (pace >= 0.09) score += 7;
            }
            if (CompanionBehavior.status(context, target, "mired")) score -= 10;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 6;
            return score;
        }
    });

    addPreferences("mudshot", {}, [
        field(pathOf("wide"), "阔泼", "boolean", {
            help: "开启：泥浆泼得更宽、掉速更深、地上泥洼更久，但单发更轻、射程更近、冷却更久。关闭：一道更重更远更快的泥浆，只糊得住脚下这一小圈。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动泼泥，先走近。越大越愿意从更远处先手糊腿。"
        }),
        field(pathOf("ai.crippleRunners"), "先糊跑得快的", "boolean", {
            help: "开启：目标正在快速移动时优先出手，先把它的速度压下来；关闭：当普通中距离候选排序。"
        })
    ]);
}
