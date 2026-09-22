/**
 * 疾速转轮 / spinout 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记贴地旋转冲进的单体重撞。目标可见、敌对、存活，且在 `ai.maxChase`（默认 8）格内；
 *   更远交给共享接近逻辑。它会让自己速度下降 2 级，所以只在够得到、值得换的时候用，不拿它空跑。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分——用一记最重的移动打击收掉，把失速的代价
 *   花在结算上；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招冲距，不够先走近；冲刺途中目标消失或离开范围就收招，不留下任何代价。
 * 放完之后：命中才付自身速度 −2；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function spinoutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("spinout", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spinoutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !spinoutWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 17;
            if (distance <= capability.data.range) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 12;
            return score;
        }
    });

    addPreferences("spinout", {}, [
        field(pathOf("preload"), "预旋式", "boolean", {
            help: "开启：起步前先原地打转蓄势，冲距 ×1.2、冲速 ×1.15、威力 ×1.1、火星更密；代价是起手 +4 刻、收招 +2 刻、冷却 +8 刻。关闭（即转式）：压腿就转，出手快、冷却短，但冲得近、撞得轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起疾速转轮，先走近。调大愿意从更远处就冲，也越容易在冲刺途中被走位甩开。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记最重的移动打击收掉，把失速的代价花在结算上；关闭则所有目标同价。"
        })
    ]);
}
