/**
 * 炸蛋 / eggbomb 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   这是一记沉重、回得慢的抛掷，偏好中距离的一次重击。
 * 对谁出手：`ai.opportunist`（默认开）打开时按局面排序——站着不动、没在跑的对手最值（原生 75 命中，
 *   打移动目标容易抡偏）；已经离地的目标更难砸中，降到最后。关闭时所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近。抡偏了蛋会在地上摊开一小片滑，逼对手绕开，这也是设计的一部分。
 * 放完之后：蛋摔碎、收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function eggbombWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse("eggbomb", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return eggbombWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !eggbombWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 17;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "opportunist", true)) {
                if (!CompanionBehavior.fleeing(context, target)) score += 8;
                if (target.grounded === false) score -= 6;
            }
            return score;
        }
    });

    addPreferences("eggbomb", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不抡蛋，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.opportunist"), "挑站定的人", "boolean", {
            help: "开启：站着不动、没在跑的对手排得更前，离地的目标降到最后（原生 75 命中，打移动目标容易抡偏）；关闭则所有目标同价。"
        })
    ]);
}
