/**
 * 迷昏拳 / dizzypunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.punishCrowd`（默认开）打开时，目标身边还挤着别人就优先——一串小扇面能一起罩住；
 *   `ai.finishLow`（默认开）打开时，残血目标排得更前，用它收尾。
 * 够不到怎么办：拳程短，reach 之内才动手，不够先贴近。
 * 放完之后：打出的混乱交回共享交战计划，让队友接手失手窗口。
 */
namespace PokemonSkills {
    function dizzypunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("dizzypunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dizzypunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !dizzypunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishCrowd", true)) {
                const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
                let crowd = 0;
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= capability.data.range) crowd++;
                }
                score += Math.min(16, crowd * 8);
            }
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 10;
            if (CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences("dizzypunch", {}, [
        field(pathOf("rapid"), "疾风连打", "boolean", {
            help: "开启：多打一拳、节拍更紧、起手收招与冷却更短，但每拳 ×0.82、混乱更短更少见——压制为主。关闭（重拳节拍）：拳少而重、更容易打晕，循环更慢。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动连打，先走近。拳程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.punishCrowd"), "优先打扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先连打，小扇面能一起罩住；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这串拳收尾；关闭则所有目标同价。"
        })
    ]);
}
